"""Administrative API — every route requires an explicit named permission.

Deny-by-default: authorization is decided here from the acting user's database
role, never from anything the client sends. Safeguards enforced server-side:

* an admin can never change their own role, create an admin, or reach a
  super-admin route;
* role can only be set through the dedicated super-admin endpoint (no generic
  user-edit path accepts a role field);
* the last active super-admin cannot be demoted, suspended, removed or banned;
* admins cannot view or modify super-admin accounts;
* dangerous actions require password re-authentication (and TOTP where enabled);
* suspending an account revokes all of its sessions immediately;
* every action writes an immutable audit entry.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import audit
from ..config import settings
from ..db import get_db
from ..deps import RequirePerm, get_current_user
from ..mailer import (account_banned_email, account_restored_email,
                      account_suspended_email, send_email)
from ..models import (Campaign, Deal, DealStatus, Notification, Platform, PlatformMedia,
                      Session as AuthSession, User)
from ..permissions import Perm, Role, is_super_admin, permissions_for, require_permission
from ..security import hash_password, verify_password
from ..storage import delete_stored
from .campaigns import _campaign_deal_counts
from .platforms import _deal_counts

log = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ------------------------------ shared helpers ------------------------------

ACTION_CODE_MAX_ATTEMPTS = 5
ACTION_CODE_LOCKOUT_MINUTES = 15


# A suspension either runs for one of these fixed periods or is indefinite.
# Validated against the set rather than trusting any integer, because
# duration_days is reachable directly over the API, not only via the picker.
ALLOWED_DURATION_DAYS = {3, 7, 14, 21, 30, 90, 180, 365}


class ReasonIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    password: Optional[str] = None      # re-authentication for dangerous actions
    action_code: Optional[str] = None
    duration_days: Optional[int] = None  # None = indefinite


def clear_suspension(row) -> None:
    """Lift a suspension. One definition, used by the manual restore endpoints
    and by scripts/expire_suspensions.py, so a timed expiry and a manual restore
    can never leave different state behind."""
    row.suspended_at = None
    row.suspended_reason = None
    row.suspended_until = None


def _suspension_until(body: ReasonIn):
    """Validate the requested duration and turn it into an expiry, or None."""
    if body.duration_days is None:
        return None
    if body.duration_days not in ALLOWED_DURATION_DAYS:
        raise HTTPException(status_code=422, detail="Invalid suspension duration.")
    return datetime.utcnow() + timedelta(days=body.duration_days)


def _reauth(actor: User, body: ReasonIn, db: Session) -> None:
    """Dangerous actions require the acting admin to prove it's really them.

    Password plus a static 8-digit action code. Because the code never rotates,
    a failed-attempt lockout stands in for the time window TOTP used to give:
    five consecutive wrong codes locks further attempts for 15 minutes.
    """
    # Mandatory for a Super-Admin: privileged actions are blocked until a code
    # exists. Normal login is unaffected, so this prompts rather than locks out.
    if actor.role == Role.SUPER_ADMIN and not actor.action_code_hash:
        raise HTTPException(
            status_code=403,
            detail="An action code is mandatory for a Super-Admin. Set one up "
                   "(POST /admin/action-code) before performing privileged actions.")

    # Lockout is checked before anything is compared, so a locked-out attacker
    # gets no signal about whether their guess was right.
    now = datetime.utcnow()
    if actor.action_code_locked_until and actor.action_code_locked_until > now:
        mins = max(1, int((actor.action_code_locked_until - now).total_seconds() // 60) + 1)
        raise HTTPException(
            status_code=403,
            detail=f"Too many incorrect action codes. Try again in about {mins} minute(s).")

    if not body.password or not verify_password(body.password, actor.password_hash):
        raise HTTPException(status_code=403,
                            detail="Password re-authentication required for this action.")

    if actor.action_code_hash:
        code = (body.action_code or "").strip()
        ok = (len(code) == 8 and code.isdigit()
              and verify_password(code, actor.action_code_hash))
        if not ok:
            actor.action_code_failed_attempts = (actor.action_code_failed_attempts or 0) + 1
            if actor.action_code_failed_attempts >= ACTION_CODE_MAX_ATTEMPTS:
                actor.action_code_locked_until = now + timedelta(minutes=ACTION_CODE_LOCKOUT_MINUTES)
                actor.action_code_failed_attempts = 0
            db.commit()
            raise HTTPException(status_code=403, detail="Invalid action code.")
        if actor.action_code_failed_attempts or actor.action_code_locked_until:
            actor.action_code_failed_attempts = 0
            actor.action_code_locked_until = None
            db.commit()


def _target_user(db: Session, user_id: int) -> User:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    return u


def _guard_target(actor: User, target: User) -> None:
    """Admins may not act on themselves or on privileged accounts."""
    if target.id == actor.id:
        raise HTTPException(status_code=403, detail="You cannot perform this action on yourself.")
    if target.role in Role.PRIVILEGED and not is_super_admin(actor):
        raise HTTPException(status_code=403,
                            detail="Only a Super-Admin may act on an admin account.")


def _active_super_admins(db: Session):
    return (db.query(User)
            .filter(User.role == Role.SUPER_ADMIN,
                    User.suspended_at.is_(None), User.banned_at.is_(None))
            .all())


def _protect_last_super_admin(db: Session, target: User) -> None:
    if target.role != Role.SUPER_ADMIN:
        return
    remaining = [u for u in _active_super_admins(db) if u.id != target.id]
    if not remaining:
        raise HTTPException(status_code=409,
                            detail="Cannot remove or demote the last active Super-Admin.")


def _revoke_sessions(db: Session, user_id: int) -> int:
    n = db.query(AuthSession).filter(AuthSession.user_id == user_id).delete()
    db.commit()
    return n


def _user_snapshot(u: User) -> dict:
    return {"role": u.role, "suspended_at": u.suspended_at.isoformat() if u.suspended_at else None,
            "suspended_until": u.suspended_until.isoformat() if u.suspended_until else None,
            "banned_at": u.banned_at.isoformat() if u.banned_at else None}


def _notify_account_action(email: str, kind: str, reason: str) -> None:
    """Tell someone their account was suspended/banned, and why.

    Background only: an admin action must not be blocked or failed by the mail
    provider, and a failure is logged rather than reported as delivered. This is
    the only place the person is told the reason — the login screen shows a
    generic message.
    """
    subject, html, text = (account_banned_email(reason) if kind == "banned"
                           else account_suspended_email(reason))
    # The copy tells them they can reply, so Reply-To has to actually reach
    # support — MAIL_FROM is a no-reply sender and is not guaranteed to equal
    # SUPPORT_EMAIL.
    ok, detail = send_email(email, subject, html, text,
                            reply_to=settings.support_email)
    if not ok:
        log.warning("%s notice not sent to %s: %s", kind, email, detail)


def user_admin_dict(u: User) -> dict:
    return {
        "id": u.id, "email": u.email, "display_name": u.display_name,
        "role": u.role, "is_business": u.is_business,
        "is_platform_owner": u.is_platform_owner,
        "suspended": u.suspended_at is not None,
        "suspended_reason": u.suspended_reason,
        "banned": u.banned_at is not None,
        "action_code_set": bool(u.action_code_hash),
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


# ------------------------------ who am I ------------------------------

@router.get("/me")
def admin_me(user: User = Depends(get_current_user)):
    """The acting user's real role + permission set, straight from the DB."""
    return {"id": user.id, "role": user.role,
            "permissions": sorted(permissions_for(user)),
            "action_code_set": bool(user.action_code_hash)}


# ------------------------------ admin accounts ------------------------------

@router.get("/admins")
def list_admins(actor: User = Depends(RequirePerm(Perm.ADMIN_VIEW)),
                db: Session = Depends(get_db)):
    rows = (db.query(User).filter(User.role.in_(Role.PRIVILEGED))
            .order_by(User.id.asc()).all())
    return [user_admin_dict(u) for u in rows]


class ActionCodeIn(BaseModel):
    password: str
    code: str


@router.post("/action-code")
def set_action_code(body: ActionCodeIn, request: Request,
                    actor: User = Depends(RequirePerm(Perm.ADMIN_VIEW)),
                    db: Session = Depends(get_db)):
    """Set or replace the Super-Admin's action code.

    Password re-entry is the gate, for first-time setup and for changing an
    existing code alike — the same bar every other sensitive change in this app
    uses. The current code is deliberately not also required: someone who has
    lost it would otherwise have no way back in, and the password already proves
    identity.
    """
    if actor.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=403,
                            detail="Action codes are only used by Super-Admin accounts.")
    if not verify_password(body.password, actor.password_hash):
        raise HTTPException(status_code=403, detail="Password is incorrect.")
    code = (body.code or "").strip()
    if len(code) != 8 or not code.isdigit():
        raise HTTPException(status_code=422,
                            detail="The action code must be exactly 8 digits.")

    had_one = bool(actor.action_code_hash)
    actor.action_code_hash = hash_password(code)     # salted PBKDF2, not a raw digest
    actor.action_code_failed_attempts = 0
    actor.action_code_locked_until = None
    audit.record(db, actor=actor, action="action_code.set", target_type="user",
                 target_id=actor.id, previous_state={"action_code_set": had_one},
                 new_state={"action_code_set": True},
                 reason="Action code changed" if had_one else "Action code set",
                 request=request)
    db.commit()
    return {"ok": True, "action_code_set": True, "replaced": had_one}


@router.get("/members")
def moderation_members(limit: int = 200,
                       actor: User = Depends(RequirePerm(Perm.ADMIN_VIEW)),
                       db: Session = Depends(get_db)):
    """Regular accounts, browsable for moderation.

    Unlike /users/search this is a listing rather than a lookup — the point is
    to reach an account without already knowing who you want. It is deliberately
    narrow: only role == USER (privileged accounts are managed from the Admins
    tab) and never the caller, matching the exclusions the search already
    applies. Capped so it stays a moderation queue rather than a member export;
    the search endpoint remains the way to find a specific person beyond the cap.
    """
    limit = max(1, min(limit, 500))
    rows = (db.query(User)
            .filter(User.role == Role.USER, User.id != actor.id,
                    # The "PromoSlot Support" system account is not a member and
                    # must not be offered up for suspension in a moderation queue.
                    func.lower(User.email) != settings.support_email.lower())
            .order_by(User.id.desc())
            .limit(limit).all())
    active, restricted = [], []
    for u in rows:
        d = {**user_admin_dict(u),
             "banned_at": u.banned_at.isoformat() if u.banned_at else None,
             "suspended_at": u.suspended_at.isoformat() if u.suspended_at else None,
             "suspended_until": u.suspended_until.isoformat() if u.suspended_until else None}
        (restricted if (u.suspended_at or u.banned_at) else active).append(d)
    return {"active": active, "restricted": restricted,
            "limit": limit, "truncated": len(rows) == limit}


@router.get("/banned")
def banned_users(actor: User = Depends(RequirePerm(Perm.ADMIN_VIEW)),
                 db: Session = Depends(get_db)):
    """Every banned account, for manual reference.

    A plain list the Super-Admin can scan — no similarity detection, no
    inference. Sourced straight from users with banned_at set.
    """
    rows = (db.query(User).filter(User.banned_at.isnot(None))
            .order_by(User.banned_at.desc()).all())
    return [{**user_admin_dict(u),
             "banned_at": u.banned_at.isoformat() if u.banned_at else None}
            for u in rows]


@router.get("/users/search")
def search_users(q: str = "", limit: int = 20,
                 actor: User = Depends(RequirePerm(Perm.ADMIN_VIEW)),
                 db: Session = Depends(get_db)):
    """Find an existing account by email or name, to promote/manage it.

    Super-Admin only (ADMIN_VIEW). Requires a real query — this is a lookup,
    not a bulk export of the member list.
    """
    term = (q or "").strip().lower()
    if len(term) < 2:
        raise HTTPException(status_code=422,
                            detail="Enter at least 2 characters to search.")
    like = f"%{term}%"
    rows = (db.query(User)
            .filter(func.lower(User.email).like(like) |
                    func.lower(func.coalesce(User.display_name, "")).like(like))
            .order_by(User.id.asc())
            .limit(min(max(limit, 1), 50)).all())
    return [user_admin_dict(u) for u in rows]


class SetRoleIn(ReasonIn):
    role: str


@router.post("/users/{user_id}/role")
def set_role(user_id: int, body: SetRoleIn, request: Request,
             actor: User = Depends(RequirePerm(Perm.ADMIN_CREATE)),
             db: Session = Depends(get_db)):
    """Assign/remove a privileged role. Super-Admin only (ADMIN_CREATE is not
    granted to ADMIN), and never on yourself — no self-promotion."""
    if body.role not in Role.ALL:
        raise HTTPException(status_code=422, detail="Unknown role")
    target = _target_user(db, user_id)
    if target.id == actor.id:
        raise HTTPException(status_code=403, detail="You cannot change your own role.")
    _reauth(actor, body, db)
    if body.role != Role.SUPER_ADMIN:
        _protect_last_super_admin(db, target)

    before = _user_snapshot(target)
    target.role = body.role
    db.commit()
    # Losing privileges takes effect immediately.
    if body.role == Role.USER:
        _revoke_sessions(db, target.id)
    db.refresh(target)
    audit.record(db, actor=actor, action="admin.set_role", target_type="user",
                 target_id=target.id, previous_state=before,
                 new_state=_user_snapshot(target), reason=body.reason, request=request)
    return user_admin_dict(target)


@router.post("/users/{user_id}/suspend")
def suspend_user(user_id: int, body: ReasonIn, request: Request,
                 background: BackgroundTasks,
                 actor: User = Depends(RequirePerm(Perm.USER_SUSPEND)),
                 db: Session = Depends(get_db)):
    target = _target_user(db, user_id)
    _guard_target(actor, target)
    _protect_last_super_admin(db, target)
    if target.role in Role.PRIVILEGED:
        require_permission(actor, Perm.ADMIN_SUSPEND)
    _reauth(actor, body, db)

    until = _suspension_until(body)
    before = _user_snapshot(target)
    target.suspended_at = datetime.utcnow()
    target.suspended_reason = body.reason.strip()
    target.suspended_until = until
    db.commit()
    revoked = _revoke_sessions(db, target.id)       # immediate loss of access
    db.refresh(target)
    audit.record(db, actor=actor, action="user.suspend", target_type="user",
                 target_id=target.id, previous_state=before,
                 new_state={**_user_snapshot(target), "sessions_revoked": revoked},
                 reason=body.reason, request=request)
    # They are already signed out, so email is the only way to reach them.
    background.add_task(_notify_account_action, target.email, "suspended",
                        target.suspended_reason or "")
    return user_admin_dict(target)


def _notify_account_restored(email: str, display_name: str) -> None:
    subject, html, text = account_restored_email(display_name)
    ok, detail = send_email(email, subject, html, text,
                            reply_to=settings.support_email)
    if not ok:
        log.warning("restore notice not sent to %s: %s", email, detail)


@router.post("/users/{user_id}/unsuspend")
def unsuspend_user(user_id: int, body: ReasonIn, request: Request,
                   background: BackgroundTasks,
                   actor: User = Depends(RequirePerm(Perm.USER_SUSPEND)),
                   db: Session = Depends(get_db)):
    target = _target_user(db, user_id)
    _guard_target(actor, target)
    before = _user_snapshot(target)
    clear_suspension(target)
    db.add(Notification(user_id=target.id, type="account_restored",
                        body="Your account is active again — welcome back to PromoSlot."))
    db.commit()
    db.refresh(target)
    audit.record(db, actor=actor, action="user.unsuspend", target_type="user",
                 target_id=target.id, previous_state=before,
                 new_state=_user_snapshot(target), reason=body.reason, request=request)
    # The in-app notice only lands once they sign in, and they were signed out
    # when suspended — so the email is what actually tells them they can.
    background.add_task(_notify_account_restored, target.email,
                        target.display_name or "")
    return user_admin_dict(target)


@router.post("/users/{user_id}/ban")
def ban_user(user_id: int, body: ReasonIn, request: Request,
             background: BackgroundTasks,
             actor: User = Depends(RequirePerm(Perm.USER_BAN)),
             db: Session = Depends(get_db)):
    """Ban this account — and, unlike suspension, its linked identity too.

    Suspension is meant to be recoverable and identity-scoped: suspending the
    platform-owner side while the business side stays usable is a deliberate,
    reasonable state, and stays that way (see suspend_user above, unchanged).

    A ban is different: it's the serious, no-appeal call that this person is
    off PromoSlot, and the two linked identities share one login (one email,
    one password) precisely so that can't be worked around by operating
    under the other identity instead. So banning either identity bans the
    email as a whole — both rows, one action.
    """
    target = _target_user(db, user_id)
    _guard_target(actor, target)
    _protect_last_super_admin(db, target)
    _reauth(actor, body, db)

    linked = db.get(User, target.linked_user_id) if target.linked_user_id else None
    if linked is not None:
        _protect_last_super_admin(db, linked)

    reason = body.reason.strip()
    now = datetime.utcnow()

    before = _user_snapshot(target)
    target.banned_at = now
    target.suspended_reason = reason
    db.commit()
    revoked = _revoke_sessions(db, target.id)
    db.refresh(target)
    audit.record(db, actor=actor, action="user.ban", target_type="user",
                 target_id=target.id, previous_state=before,
                 new_state={**_user_snapshot(target), "sessions_revoked": revoked},
                 reason=reason, request=request)

    # Same email, same login — ban the linked identity too, unless it's
    # somehow already banned (nothing to do, and no need for a second audit
    # entry re-stating the same fact).
    if linked is not None and linked.banned_at is None:
        linked_before = _user_snapshot(linked)
        linked.banned_at = now
        linked.suspended_reason = reason
        db.commit()
        linked_revoked = _revoke_sessions(db, linked.id)
        db.refresh(linked)
        audit.record(db, actor=actor, action="user.ban", target_type="user",
                     target_id=linked.id, previous_state=linked_before,
                     new_state={**_user_snapshot(linked), "sessions_revoked": linked_revoked},
                     reason=f"{reason} (cascaded: linked to banned account #{target.id})",
                     request=request)

    # One inbox either way — a single notification covers both identities.
    background.add_task(_notify_account_action, target.email, "banned",
                        target.suspended_reason or "")
    return user_admin_dict(target)


@router.post("/users/{user_id}/unban")
def unban_user(user_id: int, body: ReasonIn, request: Request,
               background: BackgroundTasks,
               actor: User = Depends(RequirePerm(Perm.USER_BAN)),
               db: Session = Depends(get_db)):
    """Lift a ban — the one deliberate exception to bans otherwise being
    permanent. Mirrors ban_user's cascade in reverse: lifts the linked
    identity's ban too, if it was banned as part of the same action, so the
    pair stays in sync exactly the way banning them did.

    Same re-authentication bar as banning (password, and an action code for
    a Super-Admin) — lifting a ban is exactly as consequential as imposing
    one, so it gets exactly the same protection, not a lighter one.
    """
    target = _target_user(db, user_id)
    _guard_target(actor, target)
    _reauth(actor, body, db)

    if target.banned_at is None:
        raise HTTPException(status_code=409, detail="This account is not banned.")

    reason = body.reason.strip()
    before = _user_snapshot(target)
    target.banned_at = None
    target.suspended_reason = None
    db.commit()
    db.refresh(target)
    audit.record(db, actor=actor, action="user.unban", target_type="user",
                 target_id=target.id, previous_state=before,
                 new_state=_user_snapshot(target), reason=reason, request=request)

    linked = db.get(User, target.linked_user_id) if target.linked_user_id else None
    if linked is not None and linked.banned_at is not None:
        linked_before = _user_snapshot(linked)
        linked.banned_at = None
        linked.suspended_reason = None
        db.commit()
        db.refresh(linked)
        audit.record(db, actor=actor, action="user.unban", target_type="user",
                     target_id=linked.id, previous_state=linked_before,
                     new_state=_user_snapshot(linked),
                     reason=f"{reason} (cascaded: linked to unbanned account #{target.id})",
                     request=request)

    db.add(Notification(user_id=target.id, type="account_restored",
                        body="Your account is active again — welcome back to PromoSlot."))
    db.commit()
    # They're signed out (banned accounts have no session), so email is the
    # only way this reaches them — same pattern as unsuspend_user.
    background.add_task(_notify_account_restored, target.email, target.display_name or "")
    return user_admin_dict(target)


# ------------------------------ listings ------------------------------

def _listing_snapshot(p: Platform) -> dict:
    return {"name": p.name, "suspended": p.suspended_at is not None,
            "suspended_reason": p.suspended_reason,
            "suspended_until": p.suspended_until.isoformat() if p.suspended_until else None}


def _campaign_snapshot(c: Campaign) -> dict:
    return {"title": c.title, "suspended": c.suspended_at is not None,
            "suspended_reason": c.suspended_reason,
            "suspended_until": c.suspended_until.isoformat() if c.suspended_until else None}


@router.post("/listings/{platform_id}/request-changes")
def listing_request_changes(platform_id: int, body: ReasonIn, request: Request,
                            actor: User = Depends(RequirePerm(Perm.LISTING_REQUEST_CHANGES)),
                            db: Session = Depends(get_db)):
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    db.add(Notification(user_id=p.owner_id, type="listing_changes_requested",
                        body=f"Changes requested on your listing “{p.name}”: {body.reason.strip()}",
                        ref=f"p{p.id}"))
    db.commit()
    audit.record(db, actor=actor, action="listing.request_changes", target_type="listing",
                 target_id=p.id, previous_state=_listing_snapshot(p),
                 new_state=_listing_snapshot(p), reason=body.reason, request=request)
    return {"ok": True, "listing_id": p.id}


@router.get("/suspended")
def list_suspended(actor: User = Depends(RequirePerm(Perm.LISTING_SUSPEND)),
                   db: Session = Depends(get_db)):
    """Suspended listings/campaigns — withheld from the marketplace, restorable."""
    ls = db.query(Platform).filter(Platform.suspended_at.isnot(None)).all()
    cs = db.query(Campaign).filter(Campaign.suspended_at.isnot(None)).all()
    return {
        "listings": [{"id": p.id, "name": p.name, "owner_id": p.owner_id,
                      "suspended_reason": p.suspended_reason,
                      "suspended_at": p.suspended_at.isoformat() if p.suspended_at else None,
                      "suspended_until": p.suspended_until.isoformat() if p.suspended_until else None}
                     for p in ls],
        "campaigns": [{"id": c.id, "title": c.title, "business_id": c.business_id,
                       "suspended_reason": c.suspended_reason,
                       "suspended_at": c.suspended_at.isoformat() if c.suspended_at else None,
                       "suspended_until": c.suspended_until.isoformat() if c.suspended_until else None}
                      for c in cs],
    }


@router.post("/listings/{platform_id}/suspend")
def listing_suspend(platform_id: int, body: ReasonIn, request: Request,
                    actor: User = Depends(RequirePerm(Perm.LISTING_SUSPEND)),
                    db: Session = Depends(get_db)):
    """Hide a listing from the marketplace without deleting it (reversible).

    Step-up authenticated like suspending a user: taking someone's listing off
    the marketplace cuts off their income the same way. Unsuspending stays
    ungated — reversing an action is deliberately a lower bar than taking it.
    """
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    _reauth(actor, body, db)
    until = _suspension_until(body)
    before = _listing_snapshot(p)
    p.suspended_at = datetime.utcnow()
    p.suspended_reason = body.reason.strip()
    p.suspended_until = until
    db.add(Notification(user_id=p.owner_id, type="listing_suspended",
                        body=f"Your listing “{p.name}” has been suspended: {body.reason.strip()}",
                        ref=f"p{p.id}"))
    db.commit(); db.refresh(p)
    audit.record(db, actor=actor, action="listing.suspend", target_type="listing",
                 target_id=p.id, previous_state=before, new_state=_listing_snapshot(p),
                 reason=body.reason, request=request)
    return {"ok": True, "listing_id": p.id, "suspended": True}


@router.post("/listings/{platform_id}/unsuspend")
def listing_unsuspend(platform_id: int, body: ReasonIn, request: Request,
                      actor: User = Depends(RequirePerm(Perm.LISTING_SUSPEND)),
                      db: Session = Depends(get_db)):
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    before = _listing_snapshot(p)
    clear_suspension(p)
    db.add(Notification(user_id=p.owner_id, type="listing_restored",
                        body=f"Your listing “{p.name}” is live again.", ref=f"p{p.id}"))
    db.commit(); db.refresh(p)
    audit.record(db, actor=actor, action="listing.unsuspend", target_type="listing",
                 target_id=p.id, previous_state=before, new_state=_listing_snapshot(p),
                 reason=body.reason, request=request)
    return {"ok": True, "listing_id": p.id, "suspended": False}


@router.get("/listings/{platform_id}/deal-status")
def listing_deal_status(platform_id: int,
                        actor: User = Depends(RequirePerm(Perm.LISTING_REMOVE)),
                        db: Session = Depends(get_db)):
    """Cheap pre-check so the confirm dialog can warn honestly before Remove
    is actually clicked — no state change here."""
    total, active = _deal_counts(db, platform_id)
    return {"deals_total": total, "deals_active": active}


@router.post("/listings/{platform_id}/remove")
def listing_remove(platform_id: int, body: ReasonIn, request: Request,
                   actor: User = Depends(RequirePerm(Perm.LISTING_REMOVE)),
                   db: Session = Depends(get_db)):
    """Super-Admin can always remove a listing, on the spot, whatever is
    attached to it — this is the one place in the app that's deliberately
    "just delete it," unlike the owner's own removal (platforms.py
    remove_platform), which archives instead when a deal is attached.

    Any deal referencing this listing is detached (platform_id set to null)
    rather than touched in any other way: its status, money, and history are
    left completely alone — this only removes the listing, never anything
    about the deal itself. See the deal-status pre-check above, which is what
    the frontend's warning is based on before this endpoint is ever called.
    """
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    _reauth(actor, body, db)
    before = _listing_snapshot(p)
    owner_id, pid, name = p.owner_id, p.id, p.name
    total, active = _deal_counts(db, pid)

    if total:
        db.query(Deal).filter(Deal.platform_id == pid).update(
            {Deal.platform_id: None}, synchronize_session=False)

    media = db.query(PlatformMedia).filter_by(platform_id=pid).all()
    for m in media:
        for path in (m.video_path, m.cover_path):
            delete_stored(path)
        db.delete(m)
    # No ORM relationship links Platform <-> PlatformMedia (just a raw FK
    # column), so SQLAlchemy has no dependency info to order these deletes
    # against the platform delete below — flush explicitly so the media rows
    # are actually gone in the database before the platform delete is even
    # issued, rather than relying on flush-ordering that isn't guaranteed.
    db.flush()
    delete_stored(p.image_path)
    db.delete(p)
    # Suspension already notifies; permanent removal is the bigger action and
    # said nothing at all. ref is deliberately None: the listing no longer
    # exists, so a "p{id}" ref would resolve to nothing and dead-click. The
    # notification popup only makes an entry clickable when it has a ref.
    db.add(Notification(
        user_id=owner_id, type="listing_removed",
        body=f"Your listing “{name}” has been permanently removed: {body.reason.strip()}",
        ref=None))
    db.commit()
    audit.record(db, actor=actor, action="listing.remove", target_type="listing",
                 target_id=pid, previous_state=before,
                 new_state={"removed": True, "mode": "deleted", "name": name,
                            "owner_id": owner_id, "deals_detached": total},
                 reason=body.reason, request=request)
    return {"ok": True, "removed_listing_id": pid, "mode": "deleted",
            "deals_detached": total, "deals_active": active}


# ------------------------------ campaigns ------------------------------

@router.post("/campaigns/{campaign_id}/request-changes")
def campaign_request_changes(campaign_id: int, body: ReasonIn, request: Request,
                             actor: User = Depends(RequirePerm(Perm.CAMPAIGN_REQUEST_CHANGES)),
                             db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.add(Notification(user_id=c.business_id, type="campaign_changes_requested",
                        body=f"Changes requested on your campaign “{c.title}”: {body.reason.strip()}",
                        ref=f"c{c.id}"))
    db.commit()
    audit.record(db, actor=actor, action="campaign.request_changes", target_type="campaign",
                 target_id=c.id, previous_state={"title": c.title},
                 new_state={"title": c.title}, reason=body.reason, request=request)
    return {"ok": True, "campaign_id": c.id}


@router.post("/campaigns/{campaign_id}/suspend")
def campaign_suspend(campaign_id: int, body: ReasonIn, request: Request,
                     actor: User = Depends(RequirePerm(Perm.CAMPAIGN_SUSPEND)),
                     db: Session = Depends(get_db)):
    """Hide a campaign from the marketplace without deleting it (reversible).

    Step-up authenticated for the same reason as listing_suspend; unsuspending
    stays ungated.
    """
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    _reauth(actor, body, db)
    until = _suspension_until(body)
    before = _campaign_snapshot(c)
    c.suspended_at = datetime.utcnow()
    c.suspended_reason = body.reason.strip()
    c.suspended_until = until
    db.add(Notification(user_id=c.business_id, type="campaign_suspended",
                        body=f"Your campaign “{c.title}” has been suspended: {body.reason.strip()}",
                        ref=f"c{c.id}"))
    db.commit(); db.refresh(c)
    audit.record(db, actor=actor, action="campaign.suspend", target_type="campaign",
                 target_id=c.id, previous_state=before, new_state=_campaign_snapshot(c),
                 reason=body.reason, request=request)
    return {"ok": True, "campaign_id": c.id, "suspended": True}


@router.post("/campaigns/{campaign_id}/unsuspend")
def campaign_unsuspend(campaign_id: int, body: ReasonIn, request: Request,
                       actor: User = Depends(RequirePerm(Perm.CAMPAIGN_SUSPEND)),
                       db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    before = _campaign_snapshot(c)
    clear_suspension(c)
    db.add(Notification(user_id=c.business_id, type="campaign_restored",
                        body=f"Your campaign “{c.title}” is live again.", ref=f"c{c.id}"))
    db.commit(); db.refresh(c)
    audit.record(db, actor=actor, action="campaign.unsuspend", target_type="campaign",
                 target_id=c.id, previous_state=before, new_state=_campaign_snapshot(c),
                 reason=body.reason, request=request)
    return {"ok": True, "campaign_id": c.id, "suspended": False}


@router.get("/campaigns/{campaign_id}/deal-status")
def campaign_deal_status(campaign_id: int,
                         actor: User = Depends(RequirePerm(Perm.CAMPAIGN_REMOVE)),
                         db: Session = Depends(get_db)):
    """See listing_deal_status above — same idea, campaign side."""
    total, active = _campaign_deal_counts(db, campaign_id)
    return {"deals_total": total, "deals_active": active}


@router.post("/campaigns/{campaign_id}/remove")
def campaign_remove(campaign_id: int, body: ReasonIn, request: Request,
                    actor: User = Depends(RequirePerm(Perm.CAMPAIGN_REMOVE)),
                    db: Session = Depends(get_db)):
    """Super-Admin can always remove a campaign on the spot — see listing_remove
    above for the full reasoning. Any deal referencing this campaign is
    detached (campaign_id set to null); its status, money, and history are
    never touched."""
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    _reauth(actor, body, db)
    cid, title, biz = c.id, c.title, c.business_id
    total, active = _campaign_deal_counts(db, cid)

    if total:
        db.query(Deal).filter(Deal.campaign_id == cid).update(
            {Deal.campaign_id: None}, synchronize_session=False)

    delete_stored(c.image_path)
    db.delete(c)
    # See listing_remove: ref is None because the campaign is gone.
    db.add(Notification(
        user_id=biz, type="campaign_removed",
        body=f"Your campaign “{title}” has been permanently removed: {body.reason.strip()}",
        ref=None))
    db.commit()
    audit.record(db, actor=actor, action="campaign.remove", target_type="campaign",
                 target_id=cid, previous_state={"title": title},
                 new_state={"removed": True, "mode": "deleted", "business_id": biz,
                            "deals_detached": total},
                 reason=body.reason, request=request)
    return {"ok": True, "removed_campaign_id": cid, "mode": "deleted",
            "deals_detached": total, "deals_active": active}


# ------------------------------ audit log (read-only) ------------------------------

@router.get("/audit-log")
def read_audit_log(limit: int = 200,
                   actor: User = Depends(RequirePerm(Perm.ADMIN_VIEW)),
                   db: Session = Depends(get_db)):
    """Read-only. The table is append-only at the database level: there is no
    update or delete path here or anywhere else."""
    from ..models import AdminAuditLog
    rows = (db.query(AdminAuditLog).order_by(AdminAuditLog.id.desc())
            .limit(min(max(limit, 1), 1000)).all())
    return [{
        "id": r.id, "actor_id": r.actor_id, "actor_role": r.actor_role,
        "action": r.action, "target_type": r.target_type, "target_id": r.target_id,
        "previous_state": r.previous_state, "new_state": r.new_state,
        "reason": r.reason, "ip_address": r.ip_address, "request_id": r.request_id,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in rows]
