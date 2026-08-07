"""Notification read endpoints.

Notifications are only ever created by real events elsewhere in the backend
(a confirmed payment, a verification, a payout, a refund, a submitted proof).
This router only lists and marks them read — it never fabricates any.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import (Campaign, Conversation, Deal, DealStatus, Message, Notification,
                      Platform, Proof, SupportTicket, SupportTicketEvent, User)
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


QUEUES = ("review", "payouts", "support")


def _queue_is_new(user: User, queue_key: str, latest_activity) -> bool:
    """Has anything landed in this queue since this admin last opened it?

    Deliberately not "is there work outstanding": a queue someone has already
    read through stops nagging them even while the items in it await action.
    Never having opened it counts as new, so a fresh reviewer isn't shown an
    empty-looking nav over a queue full of work.
    """
    if latest_activity is None:
        return False                    # nothing outstanding, nothing to flag
    last_viewed = (user.queue_last_viewed_at or {}).get(queue_key)
    if not last_viewed:
        return True                     # something outstanding, never opened this queue
    return latest_activity > datetime.fromisoformat(last_viewed)


@router.get("/summary")
def attention_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Per-user attention counts that drive the red-dot indicators.

    - unread: this user's unread notifications (real events only).
    - review_pending / awaiting_payout: how much work is in each reviewer queue
      (0 for non-reviewers). These are what the queue pages display; they are
      no longer what lights the nav dot.
    - review_new / payouts_new / support_new / unread_messages: whether anything
      has arrived since this particular person last looked. Tracked per admin,
      so one reviewer clearing their own dot doesn't clear anyone else's.
    - overdue_suspensions: timed suspensions past their end date (Super-Admin
      only). Nothing lifts these automatically, so without a prompt they would
      sit unnoticed unless someone opened the Admin console to look.
    """
    unread = db.query(Notification).filter_by(user_id=user.id, read=False).count()

    # Any incoming message I haven't read. Message.read is already maintained
    # per-recipient by get_thread, so this needs no separate view tracking.
    unread_messages = db.query(Message.id).join(
        Conversation, Message.conversation_id == Conversation.id
    ).filter(or_(Conversation.user_lo == user.id, Conversation.user_hi == user.id),
             Message.sender_id != user.id, Message.read.is_(False)).first() is not None

    review_pending = awaiting_payout = 0
    review_new = payouts_new = support_new = False
    if has_permission(user, Perm.DEAL_VIEW_EVIDENCE):
        # Review queue — "new" is when evidence was actually submitted, not when
        # the deal was created; a months-old deal proving delivery today is new.
        review_deal_ids = [d.id for d in db.query(Deal.id).filter(
            Deal.funded_at.isnot(None), Deal.verified_at.is_(None),
            Deal.status == DealStatus.PROOF_SUBMITTED)]
        review_pending = len(review_deal_ids)
        latest_review = (db.query(func.max(Proof.submitted_at))
                         .filter(Proof.deal_id.in_(review_deal_ids)).scalar()
                         if review_deal_ids else None)
        review_new = _queue_is_new(user, "review", latest_review)

        # Awaiting payouts — a deal lands here the moment it's verified.
        payout_filter = (Deal.verified_at.isnot(None), Deal.paid_at.is_(None),
                         Deal.status != DealStatus.REFUNDED)
        awaiting_payout = db.query(Deal).filter(*payout_filter).count()
        latest_payout = db.query(func.max(Deal.verified_at)).filter(*payout_filter).scalar()
        payouts_new = _queue_is_new(user, "payouts", latest_payout)

        # Contacted Support — either a new ticket arriving or the submitter
        # replying on one that's still open.
        latest_ticket = db.query(func.max(SupportTicket.created_at)).filter(
            SupportTicket.handled.is_(False)).scalar()
        latest_reply = (db.query(func.max(SupportTicketEvent.created_at))
                        .join(SupportTicket, SupportTicketEvent.ticket_id == SupportTicket.id)
                        .filter(SupportTicket.handled.is_(False),
                                SupportTicketEvent.kind == "submitter_reply").scalar())
        stamps = [t for t in (latest_ticket, latest_reply) if t is not None]
        support_new = _queue_is_new(user, "support", max(stamps) if stamps else None)

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
            "overdue_suspensions": overdue_suspensions,
            "unread_messages": unread_messages, "review_new": review_new,
            "payouts_new": payouts_new, "support_new": support_new}


@router.post("/queue-viewed/{queue}")
def mark_queue_viewed(queue: str, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    """Record that this admin has just opened a shared queue.

    Only clears the dot for the person who looked — the other reviewers still
    have their own to work through.
    """
    if queue not in QUEUES:
        raise HTTPException(status_code=422, detail="Unknown queue")
    if not has_permission(user, Perm.DEAL_VIEW_EVIDENCE):
        raise HTTPException(status_code=403, detail="Reviewer access required")
    # Whole-dict reassignment: a plain JSON column doesn't track in-place edits.
    user.queue_last_viewed_at = {**(user.queue_last_viewed_at or {}),
                                 queue: datetime.utcnow().isoformat()}
    db.commit()
    return {"queue": queue, "viewed": True}


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
