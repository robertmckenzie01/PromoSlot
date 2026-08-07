"""Notification read endpoints.

Notifications are only ever created by real events elsewhere in the backend
(a confirmed payment, a verification, a payout, a refund, a submitted proof).
This router only lists and marks them read — it never fabricates any.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Campaign, Deal, DealStatus, Notification, Platform, User
from ..permissions import Perm, has_permission, is_super_admin

router = APIRouter(prefix="/notifications", tags=["notifications"])


def notif_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "body": n.body,
        "ref": n.ref,
        "read": n.read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (db.query(Notification).filter_by(user_id=user.id)
            .order_by(Notification.id.desc()).all())
    return [notif_dict(n) for n in rows]


@router.get("/unread-count")
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter_by(user_id=user.id, read=False).count()
    return {"unread": n}


@router.get("/summary")
def attention_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Per-user attention counts that drive the red-dot indicators.

    - unread: this user's unread notifications (real events only).
    - review_pending / awaiting_payout: reviewer work queues (0 for non-reviewers),
      so verified-but-unpaid deals keep flagging attention until actually paid out.
    - overdue_suspensions: timed suspensions past their end date (Super-Admin
      only). Nothing lifts these automatically, so without a prompt they would
      sit unnoticed unless someone opened the Admin console to look.
    """
    unread = db.query(Notification).filter_by(user_id=user.id, read=False).count()
    review_pending = awaiting_payout = 0
    if has_permission(user, Perm.DEAL_VIEW_EVIDENCE):
        review_pending = (db.query(Deal)
                          .filter(Deal.funded_at.isnot(None), Deal.verified_at.is_(None),
                                  Deal.status == DealStatus.PROOF_SUBMITTED).count())
        awaiting_payout = (db.query(Deal)
                           .filter(Deal.verified_at.isnot(None), Deal.paid_at.is_(None),
                                   Deal.status != DealStatus.REFUNDED).count())
    # Same definition the Upcoming Lifts tab uses — suspended, not banned, has an
    # end date, and that date has passed. The badge and the tab must never
    # disagree about what counts.
    overdue_suspensions = 0
    if is_super_admin(user):        # short-circuits before any query for everyone else
        now = datetime.utcnow()

        def _overdue(model):
            q = db.query(model).filter(model.suspended_at.isnot(None),
                                       model.suspended_until.isnot(None),
                                       model.suspended_until <= now)
            if hasattr(model, "banned_at"):
                q = q.filter(model.banned_at.is_(None))
            return q.count()

        overdue_suspensions = _overdue(User) + _overdue(Platform) + _overdue(Campaign)

    return {"unread": unread, "review_pending": review_pending,
            "awaiting_payout": awaiting_payout,
            "overdue_suspensions": overdue_suspensions}


@router.post("/{notif_id}/read")
def mark_read(notif_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notif_id)
    if n is None or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    return {"id": n.id, "read": True}


@router.post("/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    updated = (db.query(Notification)
               .filter_by(user_id=user.id, read=False)
               .update({Notification.read: True}))
    db.commit()
    return {"marked_read": updated}
