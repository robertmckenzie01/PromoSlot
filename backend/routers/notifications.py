"""Notification read endpoints.

Notifications are only ever created by real events elsewhere in the backend
(a confirmed payment, a verification, a payout, a refund, a submitted proof).
This router only lists and marks them read — it never fabricates any.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Notification, User

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
