"""Direct messaging between real accounts.

Messages are persisted and delivered: the recipient gets a real notification
and sees the message when they open the thread. Nothing is fabricated — there
are no auto-replies, no seeded threads, and no "typing…" simulation. An inbound
message exists only because the other real account actually sent it.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Conversation, Message, Notification, User

router = APIRouter(tags=["messages"])


class SendIn(BaseModel):
    to_user_id: int
    body: str = Field(min_length=1, max_length=4000)
    context_ref: Optional[str] = None      # "p12" | "c7" | None


def _pair(a: int, b: int):
    return (a, b) if a <= b else (b, a)


def _msg_dict(m: Message, viewer_id: int) -> dict:
    return {
        "id": m.id,
        "mine": m.sender_id == viewer_id,
        "body": m.body,
        "read": m.read,
        "created_at": m.created_at.isoformat(),
    }


def _find_or_create_convo(db: Session, me: int, other: int, context_ref: Optional[str]) -> Conversation:
    lo, hi = _pair(me, other)
    q = db.query(Conversation).filter_by(user_lo=lo, user_hi=hi)
    q = (q.filter(Conversation.context_ref == context_ref) if context_ref is not None
         else q.filter(Conversation.context_ref.is_(None)))
    convo = q.first()
    if convo is None:
        convo = Conversation(user_lo=lo, user_hi=hi, context_ref=context_ref)
        db.add(convo)
        db.commit()
        db.refresh(convo)
    return convo


@router.post("/messages", status_code=201)
def send_message(body: SendIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send a message to another account (starts a thread or continues one)."""
    if body.to_user_id == user.id:
        raise HTTPException(status_code=422, detail="You can't message yourself")
    other = db.get(User, body.to_user_id)
    if other is None:
        raise HTTPException(status_code=404, detail="Recipient not found")

    convo = _find_or_create_convo(db, user.id, other.id, body.context_ref)
    msg = Message(conversation_id=convo.id, sender_id=user.id, body=body.body.strip())
    db.add(msg)
    convo.last_message_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    # Real event -> real notification for the recipient.
    db.add(Notification(
        user_id=other.id, type="message",
        body=f"New message from {user.display_name}.",
        ref=f"convo:{convo.id}",
    ))
    db.commit()
    return {"conversation_id": convo.id, "message": _msg_dict(msg, user.id)}


@router.get("/conversations")
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """My threads, most-recent first, with the last message and unread count."""
    convos = (db.query(Conversation)
              .filter((Conversation.user_lo == user.id) | (Conversation.user_hi == user.id))
              .order_by(Conversation.last_message_at.desc()).all())
    out = []
    for c in convos:
        other_id = c.user_hi if c.user_lo == user.id else c.user_lo
        other = db.get(User, other_id)
        last = (db.query(Message).filter_by(conversation_id=c.id)
                .order_by(Message.id.desc()).first())
        unread = (db.query(func.count(Message.id))
                  .filter(Message.conversation_id == c.id,
                          Message.sender_id != user.id, Message.read.is_(False))
                  .scalar() or 0)
        out.append({
            "id": c.id,
            "other_id": other_id,
            "other_name": other.display_name if other else "Unknown",
            "context_ref": c.context_ref,
            "last_body": last.body if last else "",
            "last_mine": (last.sender_id == user.id) if last else False,
            "last_at": (last.created_at if last else c.created_at).isoformat(),
            "unread": unread,
        })
    return out


@router.get("/conversations/{convo_id:int}/messages")
def get_thread(convo_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Full thread for a conversation I'm part of; marks incoming as read."""
    c = db.get(Conversation, convo_id)
    if c is None or user.id not in (c.user_lo, c.user_hi):
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = (db.query(Message).filter_by(conversation_id=convo_id)
            .order_by(Message.id.asc()).all())
    changed = False
    for m in msgs:
        if m.sender_id != user.id and not m.read:
            m.read = True
            changed = True
    if changed:
        db.commit()

    other_id = c.user_hi if c.user_lo == user.id else c.user_lo
    other = db.get(User, other_id)
    return {
        "id": c.id,
        "other_id": other_id,
        "other_name": other.display_name if other else "Unknown",
        "context_ref": c.context_ref,
        "messages": [_msg_dict(m, user.id) for m in msgs],
    }
