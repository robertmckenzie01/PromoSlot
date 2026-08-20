"""Account deletion — anonymise, don't hard-delete.

The Privacy Policy already promises both things at once: "you can request
deletion of your account" AND "some data may be retained where we have a
legal obligation to do so" / "deal and payment records: retained as
required for accounting, tax, and dispute-resolution purposes." Hard-
deleting the users row would break both promises at once — it would blow
up the foreign keys on every deal, review, and message the account is
party to, wiping the OTHER person's record of a real transaction along
with it, and destroy exactly the accounting trail the policy says is kept.

So deletion here means: the row stays (deals/reviews/messages that
reference it keep working), but every piece of personal data on it is
scrubbed or replaced with a placeholder, real uploaded files are actually
removed from storage (not just unlinked in the DB), every session and
outstanding token is revoked, and users.deleted_at is set so the account
is treated as gone everywhere it would otherwise be displayed or allowed
to log in (see deps.assert_active). This is the standard "right to
erasure with a legitimate-retention exception" pattern, not a shortcut.

Two entry points share this: self-service (routers/profiles.py) and an
admin wipe (routers/admin.py), both calling delete_account_cascade().
"""
from datetime import datetime

from sqlalchemy.orm import Session

from .models import (EmailVerificationToken, PasswordResetToken, ProfileAsset,
                     Session as AuthSession, User)
from .storage import delete_stored

PLACEHOLDER_NAME = "Deleted user"


def _placeholder_email(user_id: int) -> str:
    # Syntactically valid, guaranteed unique per row, and obviously not a
    # real inbox — so it can never collide with a real signup and never
    # actually reach anyone if something tried to send to it.
    return f"deleted-user-{user_id}@deleted.usepromoslot.com"


def anonymize_user(db: Session, user: User) -> dict:
    """Scrub one row's personal data in place. Returns a summary for the
    audit log. Does not commit — the caller controls the transaction so a
    cascade to a linked account can be committed together."""
    before = {
        "email": user.email, "display_name": user.display_name,
        "had_avatar": bool(user.avatar_path), "had_intro_video": bool(user.intro_video_path),
    }

    # Real files, not just the DB pointer to them.
    delete_stored(user.avatar_path)
    delete_stored(user.intro_video_path)
    assets = db.query(ProfileAsset).filter(ProfileAsset.user_id == user.id).all()
    for a in assets:
        delete_stored(a.path)
        db.delete(a)

    user.email = _placeholder_email(user.id)
    user.password_hash = "!deleted"          # never matches the pbkdf2 format -> unusable
    user.display_name = PLACEHOLDER_NAME
    user.about_text = None
    user.links = []
    user.avatar_path = None
    user.avatar_content_type = None
    user.intro_video_path = None
    user.intro_video_content_type = None
    user.action_code_hash = None
    user.action_code_failed_attempts = 0
    user.action_code_locked_until = None
    user.deleted_at = datetime.utcnow()

    revoked = (db.query(AuthSession).filter(AuthSession.user_id == user.id)
               .delete(synchronize_session=False))
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete(synchronize_session=False)
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id).delete(synchronize_session=False)

    return {"before": before, "sessions_revoked": revoked, "assets_removed": len(assets)}


def delete_account_cascade(db: Session, target: User) -> list:
    """Anonymise `target`, and its linked identity too if one exists and
    isn't already deleted — same reasoning as ban_user's cascade in
    routers/admin.py: one login, one real person, one deletion request.

    Returns a list of (user, summary) pairs, one per row actually touched,
    for the caller to write audit entries from.
    """
    touched = []
    summary = anonymize_user(db, target)
    db.commit()
    db.refresh(target)
    touched.append((target, summary))

    if target.linked_user_id:
        linked = db.get(User, target.linked_user_id)
        if linked is not None and linked.deleted_at is None:
            linked_summary = anonymize_user(db, linked)
            db.commit()
            db.refresh(linked)
            touched.append((linked, linked_summary))

    return touched
