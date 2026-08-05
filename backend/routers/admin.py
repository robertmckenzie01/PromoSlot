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
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import audit
from ..db import get_db
from ..deps import RequirePerm, get_current_user
from ..mailer import (account_banned_email, account_suspended_email,
                      send_email)
from ..models import (Campaign, Deal, DealStatus, Notification, Platform, Session as AuthSession,
                      User)
from ..permissions import Perm, Role, is_super_admin, permissions_for, require_permission
from ..security import verify_password
from ..totp import hash_code, verify as totp_verify

log = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ------------------------------ shared helpers ------------------------------

class ReasonIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    password: Optional[str] = None      # re-authentication for dangerous actions
    mfa_code: Optional[str] = None


def _reauth(actor: User, body: ReasonIn) -> None:
    """Dangerous actions require the acting admin to prove it's really them."""
    # MFA is mandatory for a Super-Admin: privileged actions are blocked until
    # enrolment is complete (normal login is unaffected, so no lockout).
    if actor.role == Role.SUPER_ADMIN and not actor.mfa_enabled:
        raise HTTPException(
            status_code=403,
            detail="Multi-factor authentication is mandatory for a Super-Admin. "
                   "Enrol at /mfa/start before performing privileged actions.")
    if not body.password or not verify_password(body.password, actor.password_hash):
        raise HTTPException(status_code=403,
                            detail="Password re-authentication required for this action.")
    if actor.mfa_enabled:
        if not body.mfa_code or not totp_verify(actor.mfa_secret, body.mfa_code):
            raise HTTPException(status_code=403, detail="Valid MFA code required.")


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
    ok, detail = send_email(email, subject, html, text)
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
        "mfa_enabled": bool(u.mfa_enabled),
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


# ------------------------------ who am I ------------------------------

@router.get("/me")
def admin_me(user: User = Depends(get_current_user)):
    """The acting user's real role + permission set, straight from the DB."""
    return {"id": user.id, "role": user.role,
            "permissions": sorted(permissions_for(user))}


# ------------------------------ admin accounts ------------------------------

@router.get("/admins")
def list_admins(actor: User = Depends(RequirePerm(Perm.ADMIN_VIEW)),
                db: Session = Depends(get_db)):
    rows = (db.query(User).filter(User.role.in_(Role.PRIVILEGED))
            .order_by(User.id.asc()).all())
    return [user_admin_dict(u) for u in rows]


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
    _reauth(actor, body)
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
    _reauth(actor, body)

    before = _user_snapshot(target)
    target.suspended_at = datetime.utcnow()
    target.suspended_reason = body.reason.strip()
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


@router.post("/users/{user_id}/unsuspend")
def unsuspend_user(user_id: int, body: ReasonIn, request: Request,
                   actor: User = Depends(RequirePerm(Perm.USER_SUSPEND)),
                   db: Session = Depends(get_db)):
    target = _target_user(db, user_id)
    _guard_target(actor, target)
    before = _user_snapshot(target)
    target.suspended_at = None
    target.suspended_reason = None
    db.commit()
    db.refresh(target)
    audit.record(db, actor=actor, action="user.unsuspend", target_type="user",
                 target_id=target.id, previous_state=before,
                 new_state=_user_snapshot(target), reason=body.reason, request=request)
    return user_admin_dict(target)


@router.post("/users/{user_id}/ban")
def ban_user(user_id: int, body: ReasonIn, request: Request,
             background: BackgroundTasks,
             actor: User = Depends(RequirePerm(Perm.USER_BAN)),
             db: Session = Depends(get_db)):
    target = _target_user(db, user_id)
    _guard_target(actor, target)
    _protect_last_super_admin(db, target)
    _reauth(actor, body)

    before = _user_snapshot(target)
    target.banned_at = datetime.utcnow()
    target.suspended_reason = body.reason.strip()
    db.commit()
    revoked = _revoke_sessions(db, target.id)
    db.refresh(target)
    audit.record(db, actor=actor, action="user.ban", target_type="user",
                 target_id=target.id, previous_state=before,
                 new_state={**_user_snapshot(target), "sessions_revoked": revoked},
                 reason=body.reason, request=request)
    background.add_task(_notify_account_action, target.email, "banned",
                        target.suspended_reason or "")
    return user_admin_dict(target)


# ------------------------------ listings ------------------------------

def _listing_snapshot(p: Platform) -> dict:
    return {"name": p.name, "suspended": p.suspended_at is not None,
            "suspended_reason": p.suspended_reason}


def _campaign_snapshot(c: Campaign) -> dict:
    return {"title": c.title, "suspended": c.suspended_at is not None,
            "suspended_reason": c.suspended_reason}


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
                      "suspended_at": p.suspended_at.isoformat() if p.suspended_at else None}
                     for p in ls],
        "campaigns": [{"id": c.id, "title": c.title, "business_id": c.business_id,
                       "suspended_reason": c.suspended_reason,
                       "suspended_at": c.suspended_at.isoformat() if c.suspended_at else None}
                      for c in cs],
    }


@router.post("/listings/{platform_id}/suspend")
def listing_suspend(platform_id: int, body: ReasonIn, request: Request,
                    actor: User = Depends(RequirePerm(Perm.LISTING_SUSPEND)),
                    db: Session = Depends(get_db)):
    """Hide a listing from the marketplace without deleting it (reversible)."""
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    before = _listing_snapshot(p)
    p.suspended_at = datetime.utcnow()
    p.suspended_reason = body.reason.strip()
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
    p.suspended_at = None
    p.suspended_reason = None
    db.add(Notification(user_id=p.owner_id, type="listing_restored",
                        body=f"Your listing “{p.name}” is live again.", ref=f"p{p.id}"))
    db.commit(); db.refresh(p)
    audit.record(db, actor=actor, action="listing.unsuspend", target_type="listing",
                 target_id=p.id, previous_state=before, new_state=_listing_snapshot(p),
                 reason=body.reason, request=request)
    return {"ok": True, "listing_id": p.id, "suspended": False}


@router.post("/listings/{platform_id}/remove")
def listing_remove(platform_id: int, body: ReasonIn, request: Request,
                   actor: User = Depends(RequirePerm(Perm.LISTING_REMOVE)),
                   db: Session = Depends(get_db)):
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Listing not found")
    _reauth(actor, body)
    before = _listing_snapshot(p)
    owner_id, pid, name = p.owner_id, p.id, p.name
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
                 new_state={"removed": True, "name": name, "owner_id": owner_id},
                 reason=body.reason, request=request)
    return {"ok": True, "removed_listing_id": pid}


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
    """Hide a campaign from the marketplace without deleting it (reversible)."""
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    before = _campaign_snapshot(c)
    c.suspended_at = datetime.utcnow()
    c.suspended_reason = body.reason.strip()
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
    c.suspended_at = None
    c.suspended_reason = None
    db.add(Notification(user_id=c.business_id, type="campaign_restored",
                        body=f"Your campaign “{c.title}” is live again.", ref=f"c{c.id}"))
    db.commit(); db.refresh(c)
    audit.record(db, actor=actor, action="campaign.unsuspend", target_type="campaign",
                 target_id=c.id, previous_state=before, new_state=_campaign_snapshot(c),
                 reason=body.reason, request=request)
    return {"ok": True, "campaign_id": c.id, "suspended": False}


@router.post("/campaigns/{campaign_id}/remove")
def campaign_remove(campaign_id: int, body: ReasonIn, request: Request,
                    actor: User = Depends(RequirePerm(Perm.CAMPAIGN_REMOVE)),
                    db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    _reauth(actor, body)
    cid, title, biz = c.id, c.title, c.business_id
    db.delete(c)
    # See listing_remove: ref is None because the campaign is gone.
    db.add(Notification(
        user_id=biz, type="campaign_removed",
        body=f"Your campaign “{title}” has been permanently removed: {body.reason.strip()}",
        ref=None))
    db.commit()
    audit.record(db, actor=actor, action="campaign.remove", target_type="campaign",
                 target_id=cid, previous_state={"title": title},
                 new_state={"removed": True, "business_id": biz},
                 reason=body.reason, request=request)
    return {"ok": True, "removed_campaign_id": cid}


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
