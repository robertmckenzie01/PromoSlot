"""Lift timed suspensions whose period has elapsed.

Run on a schedule:  python scripts/expire_suspensions.py

Suspensions expire because this sweep runs, not because someone happened to
look at the row — an account stays suspended in the database until its period
is genuinely over, and is restored whether or not anyone visits it.

Only rows that are BOTH suspended and have an expiry in the past are touched.
An indefinite suspension (suspended_until IS NULL) is never lifted here; only a
Super-Admin restoring it by hand ends that. Bans are not suspensions and are
never touched by this script at all.

Safe to run repeatedly and safe to run with nothing to do.
"""
import sys
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

sys.path.insert(0, __file__.rsplit("/scripts/", 1)[0])

from backend import audit                                          # noqa: E402
from backend.db import SessionLocal                                # noqa: E402
from backend.models import Campaign, Notification, Platform, User  # noqa: E402
from backend.routers.admin import (clear_suspension,               # noqa: E402
                                   _campaign_snapshot, _listing_snapshot,
                                   _user_snapshot)

REASON = "Suspension period expired"


def _due(q, model, now):
    """Rows that are suspended AND whose expiry has passed."""
    return q.filter(model.suspended_at.isnot(None),
                    model.suspended_until.isnot(None),
                    model.suspended_until <= now).all()


def run() -> dict:
    db = SessionLocal()
    now = datetime.utcnow()
    counts = {"users": 0, "listings": 0, "campaigns": 0}
    try:
        for u in _due(db.query(User), User, now):
            before = _user_snapshot(u)
            clear_suspension(u)
            # No "welcome back" notification for users: the manual restore path
            # doesn't send one either, and inventing copy here would make the
            # automatic path behave differently from the human one.
            audit.record(db, actor=None, action="user.unsuspend", target_type="user",
                         target_id=u.id, previous_state=before,
                         new_state=_user_snapshot(u), reason=REASON)
            db.commit()
            counts["users"] += 1
            print(f"  restored user {u.id} ({u.email})")

        for p in _due(db.query(Platform), Platform, now):
            before = _listing_snapshot(p)
            clear_suspension(p)
            # Same notification the manual restore sends — one behaviour, whether
            # a person or the timer lifted it.
            db.add(Notification(user_id=p.owner_id, type="listing_restored",
                                body=f"Your listing “{p.name}” is live again.",
                                ref=f"p{p.id}"))
            audit.record(db, actor=None, action="listing.unsuspend", target_type="listing",
                         target_id=p.id, previous_state=before,
                         new_state=_listing_snapshot(p), reason=REASON)
            db.commit()
            counts["listings"] += 1
            print(f"  restored listing {p.id} ({p.name})")

        for c in _due(db.query(Campaign), Campaign, now):
            before = _campaign_snapshot(c)
            clear_suspension(c)
            db.add(Notification(user_id=c.business_id, type="campaign_restored",
                                body=f"Your campaign “{c.title}” is live again.",
                                ref=f"c{c.id}"))
            audit.record(db, actor=None, action="campaign.unsuspend", target_type="campaign",
                         target_id=c.id, previous_state=before,
                         new_state=_campaign_snapshot(c), reason=REASON)
            db.commit()
            counts["campaigns"] += 1
            print(f"  restored campaign {c.id} ({c.title})")
    finally:
        db.close()
    return counts


if __name__ == "__main__":
    n = run()
    total = sum(n.values())
    print(f"Restored {total}: {n['users']} users, {n['listings']} listings, "
          f"{n['campaigns']} campaigns")
    sys.exit(0)
