"""User profile media: account avatar + profile intro video.

Uploaded from My Account; served publicly so anyone viewing a profile sees them.
Stored via backend.storage, so these live in R2 (durable) when configured.
"""
import logging
from typing import List, Optional

from fastapi import (APIRouter, BackgroundTasks, Depends, File, Form,
                     HTTPException, Request, Response, UploadFile)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import audit, marketing
from ..account_deactivation import deactivate_account_cascade
from ..account_deletion import delete_account_cascade
from ..config import settings
from ..db import get_db
from ..deps import COOKIE_NAME, get_current_user
from ..mailer import account_deactivated_email, account_deleted_email, send_email
from ..models import Platform, ProfileAsset, User
from ..services import revoke_platform_owner_verification
from ..security import verify_password
from ..storage import delete_stored, save_generic, serve_stored, stored_exists

router = APIRouter(tags=["profiles"])
log = logging.getLogger(__name__)

IMG_MAX = 50 * 1024 * 1024  # generous cap for profile pictures


def asset_dict(a: ProfileAsset) -> dict:
    ct = a.content_type or ""
    return {
        "id": a.id, "title": a.title or "file",
        "url": f"/users/{a.user_id}/assets/{a.id}/file",
        "is_image": ct.startswith("image/"),
        "content_type": ct,
    }


def _replace(old_path):
    """Remove the previously stored object/file, wherever it lived."""
    delete_stored(old_path)


@router.post("/me/avatar", status_code=201)
def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    try:
        path, _ = save_generic(f"users/user_{user.id}", file, IMG_MAX)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    _replace(user.avatar_path)
    user.avatar_path, user.avatar_content_type = path, file.content_type
    db.commit()
    return {"avatar_url": f"/users/{user.id}/avatar"}


@router.get("/users/{user_id}/avatar")
def get_avatar(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if u is None or not u.avatar_path or not stored_exists(u.avatar_path):
        raise HTTPException(status_code=404, detail="No avatar")
    return serve_stored(u.avatar_path, u.avatar_content_type or "image/jpeg")


@router.post("/me/intro-video", status_code=201)
def upload_intro_video(file: UploadFile = File(...), user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    try:
        path, _ = save_generic(f"users/user_{user.id}", file, settings.max_video_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    _replace(user.intro_video_path)
    user.intro_video_path, user.intro_video_content_type = path, file.content_type
    db.commit()
    return {"intro_video_url": f"/users/{user.id}/intro-video"}


@router.get("/users/{user_id}/intro-video")
def get_intro_video(user_id: int, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if u is None or not u.intro_video_path or not stored_exists(u.intro_video_path):
        raise HTTPException(status_code=404, detail="No intro video")
    return serve_stored(u.intro_video_path, u.intro_video_content_type or "video/mp4")


# ---------------- "Who we are": about text, links, and files/images ----------------

class ProfileIn(BaseModel):
    about_text: Optional[str] = Field(default=None, max_length=5000)
    links: Optional[List[dict]] = None      # [{label, url}, …] — no cap
    display_name: Optional[str] = Field(default=None, max_length=120)
    # Private (see User.phone in models.py) — deliberately not part of the
    # public "who we are" profile this endpoint otherwise edits. Shares the
    # endpoint rather than getting its own because the update below only
    # ever touches a field when it's actually present in the request body,
    # so the "who we are" editor (which never sends phone) can't blank it.
    phone: Optional[str] = Field(default=None, max_length=32)


@router.post("/me/profile")
def update_profile(body: ProfileIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if body.display_name is not None:
        name = body.display_name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Display name cannot be empty")
        # A platform owner's display_name is the "claimed on PromoSlot" side
        # of the platform_identity check (see verification.py's
        # _submitter_context — it's compared against Stripe's legal name).
        # Business identity is verified against Business.company instead
        # (see routers/businesses.py), never User.display_name, so this
        # only matters for platform-owner accounts.
        if user.is_platform_owner and name != (user.display_name or "") and \
           db.query(Platform).filter_by(owner_id=user.id, verified=True).first() is not None:
            revoke_platform_owner_verification(db, user.id, gate="platform_identity",
                reason="your account name changed since it was verified")
        user.display_name = name
    if body.about_text is not None:
        user.about_text = body.about_text.strip() or None
    if body.phone is not None:
        user.phone = body.phone.strip() or None
    if body.links is not None:
        clean = []
        for l in body.links:
            url = (l.get("url") or "").strip()
            if url:
                clean.append({"label": (l.get("label") or "").strip() or url, "url": url})
        user.links = clean
    db.commit()
    return {"display_name": user.display_name or "", "about_text": user.about_text or "",
            "links": user.links or [], "phone": user.phone or ""}


class MarketingPreferenceIn(BaseModel):
    enabled: bool


@router.post("/me/marketing-preference")
def set_marketing_preference(body: MarketingPreferenceIn, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """The My Account toggle — the other opt-in path alongside the signup
    checkbox and the one-click email link (see backend/marketing.py and
    routers/marketing.py). Anyone can flip this on or off here at any time,
    independent of what either of those other two paths last set."""
    marketing.set_marketing_preference(db, user, body.enabled, source="settings")
    return {"opted_in": user.marketing_opt_in}


class DeleteAccountIn(BaseModel):
    password: str = Field(min_length=1)
    # User-picked checklist reasons joined into one string by the frontend
    # (plus free text under "Other"). Purely informational — never gates
    # the deletion itself.
    reason: Optional[str] = Field(default=None, max_length=1000)


@router.post("/me/delete")
def delete_my_account(body: DeleteAccountIn, request: Request, response: Response,
                      background: BackgroundTasks,
                      user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Self-service account deletion — the right the Privacy Policy promises.

    Requires the current password so a hijacked session cookie alone can't
    wipe the account (same bar as changing a password). Anonymises this
    identity and, if one exists, the linked identity under the same login —
    one person, one login, one deletion request, mirroring how a ban already
    cascades in routers/admin.py. Deals, reviews and messages this account is
    party to are left in place (see account_deletion.py for why) but will
    show "Deleted user" going forward.
    """
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=403, detail="That password isn't correct.")

    # Capture real addresses before anonymize_user() scrambles them — this is
    # the last moment any of them are reachable.
    to_notify = [(row.id, row.email) for row in
                 ([user] + ([db.get(User, user.linked_user_id)]
                            if user.linked_user_id else []))
                 if row is not None]

    given_reason = (body.reason or "").strip()
    audit_reason = ("Self-service account deletion. User-selected reason: " + given_reason
                    if given_reason else "Self-service account deletion. No reason given.")
    email_note = (given_reason if given_reason
                 else "Requested from your PromoSlot account settings.")

    touched = delete_account_cascade(db, user)
    for row, summary in touched:
        audit.record(db, actor=user, action="user.self_delete", target_type="user",
                     target_id=row.id, previous_state=summary["before"],
                     new_state={"deleted_at": row.deleted_at.isoformat(),
                               "sessions_revoked": summary["sessions_revoked"],
                               "assets_removed": summary["assets_removed"],
                               "listings_removed": summary["listings_removed"]},
                     reason=audit_reason, request=request)

    for row_id, email in to_notify:
        background.add_task(_notify_deleted, email, email_note)

    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True, "accounts_deleted": len(touched)}


def _notify_deleted(email: str, reason: str) -> None:
    subj, html, text = account_deleted_email(reason)
    # Copy points them at support_email directly ("contact ... straight
    # away"), not "reply to this email" — but Reply-To is set anyway so a
    # reply out of habit still reaches a real inbox instead of the no-reply
    # MAIL_FROM sender. Matches the admin-triggered deletion path below.
    ok, detail = send_email(email, subj, html, text, reply_to=settings.support_email)
    if not ok:
        log.warning("account-deleted email not sent to %s: %s", email, detail)


class DeactivateAccountIn(BaseModel):
    password: str = Field(min_length=1)
    reason: Optional[str] = Field(default=None, max_length=1000)


@router.post("/me/deactivate")
def deactivate_my_account(body: DeactivateAccountIn, request: Request, response: Response,
                          background: BackgroundTasks,
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Self-service, reversible pause — the other half of the "delete or
    deactivate" choice next to delete_my_account above.

    Same password bar as deletion (a hijacked session cookie alone can't do
    this either). Unlike deletion, nothing is scrubbed: email, password and
    profile content are untouched, and any listings/campaigns are only
    suspended, not removed — see account_deactivation.py. Signing back in
    with the correct password (routers/auth.py:login) clears deactivated_at
    automatically, no separate "reactivate" step needed.
    """
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=403, detail="That password isn't correct.")

    to_notify = [row.email for row in
                 ([user] + ([db.get(User, user.linked_user_id)]
                            if user.linked_user_id else []))
                 if row is not None]

    given_reason = (body.reason or "").strip()
    audit_reason = ("Self-service account deactivation. User-selected reason: " + given_reason
                    if given_reason else "Self-service account deactivation. No reason given.")
    email_note = (given_reason if given_reason
                 else "Requested from your PromoSlot account settings.")

    touched = deactivate_account_cascade(db, user)
    for row, revoked in touched:
        audit.record(db, actor=user, action="user.self_deactivate", target_type="user",
                     target_id=row.id, previous_state={"deactivated_at": None},
                     new_state={"deactivated_at": row.deactivated_at.isoformat(),
                               "sessions_revoked": revoked},
                     reason=audit_reason, request=request)

    # Computed once off the acting user — linked identities (if any) share
    # one real inbox and, per marketing.py, the same consent state, so one
    # check covers every address in to_notify.
    optin_link = marketing.optin_nudge_url(db, user)
    for email in to_notify:
        background.add_task(_notify_deactivated, email, email_note, optin_link)

    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True, "accounts_deactivated": len(touched)}


def _notify_deactivated(email: str, reason: str, optin_url: str = "") -> None:
    subj, html, text = account_deactivated_email(reason, optin_url=optin_url)
    # Same reasoning as _notify_deleted above: the copy names support_email
    # directly rather than saying "reply", but Reply-To is set so a reply
    # anyway still lands somewhere real.
    ok, detail = send_email(email, subj, html, text, reply_to=settings.support_email)
    if not ok:
        log.warning("account-deactivated email not sent to %s: %s", email, detail)


@router.post("/me/assets", status_code=201)
def add_asset(file: UploadFile = File(...), title: Optional[str] = Form(None),
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        path, _ = save_generic(f"users/user_{user.id}/assets", file, IMG_MAX)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    a = ProfileAsset(user_id=user.id, title=(title or file.filename), path=path,
                     content_type=file.content_type)
    db.add(a)
    db.commit()
    db.refresh(a)
    return asset_dict(a)


@router.delete("/me/assets/{asset_id}")
def delete_asset(asset_id: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    a = db.get(ProfileAsset, asset_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Asset not found")
    _replace(a.path)
    db.delete(a)
    db.commit()
    return {"deleted": asset_id}


@router.get("/users/{user_id}/assets/{asset_id}/file")
def get_asset_file(user_id: int, asset_id: int, db: Session = Depends(get_db)):
    a = db.get(ProfileAsset, asset_id)
    if a is None or a.user_id != user_id or not stored_exists(a.path):
        raise HTTPException(status_code=404, detail="Asset not found")
    return serve_stored(a.path, a.content_type or "application/octet-stream")
