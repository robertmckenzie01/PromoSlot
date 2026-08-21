"""Reversible self-service account deactivation — pause your profile without
losing anything.

Distinct from account_deletion.py's anonymize_user(), which is permanent:
deactivation only touches deactivated_at, revokes sessions, and hides this
identity's own listings — email, password and all profile content are left
untouched, so logging back in (routers/auth.py:login()) restores everything
exactly as it was.

Cascaded to a linked identity the same way ban_user cascades in
routers/admin.py: unlike suspend_user (an admin's identity-scoped punitive
call), this is the person's own decision about their PromoSlot presence as a
whole, and it's also the only way to guarantee reactivation always works —
login() only ever authenticates the "primary" (lowest-id) linked row, so if
deactivation weren't cascaded, deactivating the non-primary identity alone
could leave it permanently unreachable through normal login.
"""
from datetime import datetime
from typing import List, Tuple

from sqlalchemy.orm import Session

from .models import Campaign, Platform, Session as AuthSession, User

# Marks a Platform/Campaign suspension as caused by the owner's own
# deactivation, not an admin moderation action — so reactivation only ever
# lifts suspensions it caused itself, never a real admin suspension that
# happens to be in effect at the same time.
DEACTIVATION_SUSPEND_REASON = "Account deactivated by owner"


def deactivate_user(db: Session, user: User) -> int:
    """Mark `user` deactivated, sign them out everywhere, and hide their own
    listings/campaigns the same restorable way an admin suspension would.
    Returns sessions revoked. Caller commits."""
    user.deactivated_at = datetime.utcnow()
    revoked = (db.query(AuthSession).filter(AuthSession.user_id == user.id)
               .delete(synchronize_session=False))
    now = datetime.utcnow()
    if user.is_platform_owner:
        db.query(Platform).filter(
            Platform.owner_id == user.id, Platform.suspended_at.is_(None),
        ).update({"suspended_at": now, "suspended_reason": DEACTIVATION_SUSPEND_REASON},
                synchronize_session=False)
    if user.is_business:
        db.query(Campaign).filter(
            Campaign.business_id == user.id, Campaign.suspended_at.is_(None),
        ).update({"suspended_at": now, "suspended_reason": DEACTIVATION_SUSPEND_REASON},
                synchronize_session=False)
    return revoked


def reactivate_user(db: Session, user: User) -> None:
    """Clear deactivation and un-hide only the listings deactivation itself
    hid (a real admin suspension in place at the same time is left alone).
    Caller commits."""
    user.deactivated_at = None
    db.query(Platform).filter(
        Platform.owner_id == user.id,
        Platform.suspended_reason == DEACTIVATION_SUSPEND_REASON,
    ).update({"suspended_at": None, "suspended_reason": None}, synchronize_session=False)
    db.query(Campaign).filter(
        Campaign.business_id == user.id,
        Campaign.suspended_reason == DEACTIVATION_SUSPEND_REASON,
    ).update({"suspended_at": None, "suspended_reason": None}, synchronize_session=False)


def deactivate_account_cascade(db: Session, target: User) -> List[Tuple[User, int]]:
    """Deactivate `target` and, if one exists and isn't already deactivated,
    its linked identity too. Returns [(row, sessions_revoked), ...]."""
    touched = []
    revoked = deactivate_user(db, target)
    db.commit()
    db.refresh(target)
    touched.append((target, revoked))
    if target.linked_user_id:
        linked = db.get(User, target.linked_user_id)
        if linked is not None and linked.deactivated_at is None:
            linked_revoked = deactivate_user(db, linked)
            db.commit()
            db.refresh(linked)
            touched.append((linked, linked_revoked))
    return touched


def reactivate_account_cascade(db: Session, target: User) -> List[User]:
    """Reactivate `target` and its linked identity, whichever of the two are
    currently deactivated. Called automatically on a successful login."""
    touched = []
    if target.deactivated_at is not None:
        reactivate_user(db, target)
        touched.append(target)
    if target.linked_user_id:
        linked = db.get(User, target.linked_user_id)
        if linked is not None and linked.deactivated_at is not None:
            reactivate_user(db, linked)
            touched.append(linked)
    if touched:
        db.commit()
        for row in touched:
            db.refresh(row)
    return touched
