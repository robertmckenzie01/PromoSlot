"""Contact Support — real tickets stored server-side (admin/reviewer visible).

Submissions are persisted to the support_tickets table AND alerted to the
support inbox by email. Never a fire-and-forget success.
"""
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from datetime import datetime

from .. import audit
from ..config import settings
from ..db import get_db
from ..deps import get_current_reviewer, get_current_user_optional
from ..mailer import (send_email, support_reply_email, support_ticket_email)
from ..models import (Conversation, Message, Notification, SupportTicket,
                      SupportTicketEvent, User)
from ..permissions import ROLE_PERMISSIONS, Perm, has_permission

log = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])


class TicketIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    mobile: Optional[str] = Field(default=None, max_length=60)
    subject: str = Field(min_length=1, max_length=300)
    body: str = Field(min_length=1, max_length=5000)


def _clean(v):
    return (v or "").strip() or None


@router.post("", status_code=201)
def create_ticket(body: TicketIn, request: Request, background: BackgroundTasks,
                  db: Session = Depends(get_db),
                  user: Optional[User] = Depends(get_current_user_optional)):
    t = SupportTicket(
        user_id=user.id if user else None,
        name=body.name.strip(), email=_clean(body.email), mobile=_clean(body.mobile),
        subject=body.subject.strip(), body=body.body.strip(),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    # Always-on staff alert, independent of whether anyone opens the in-app
    # queue. Backgrounded so a slow or failing mail provider can never make a
    # submission look like it failed — the ticket is already saved.
    background.add_task(_alert_support_inbox, t.id, t.name, t.email or "",
                        t.mobile or "", t.subject, t.body)
    # In-app too, so the bell reflects work waiting in the queue and not just
    # whoever happens to be watching the support mailbox.
    for rid in _reviewer_ids(db):
        db.add(Notification(user_id=rid, type="support_ticket",
                            body=f"New support ticket from {t.name}: \"{t.subject}\".",
                            ref=f"support_ticket:{t.id}"))
    db.commit()
    return {"id": t.id, "ok": True}


def _alert_support_inbox(ticket_id: int, name: str, email: str, mobile: str,
                         subject: str, body: str) -> None:
    subj, html, text = support_ticket_email(ticket_id, name, email, mobile, subject, body)
    ok, detail = send_email(settings.support_email, subj, html, text)
    if not ok:
        # Logged, never surfaced to the submitter and never treated as delivered.
        log.warning("support alert not sent for ticket %s: %s", ticket_id, detail)


# ---------------------------------------------------------------- reviewer queue
# Every reviewer sees every ticket. The first to claim one owns it and is the
# only account that may send the customer-facing reply; everyone else can still
# read it, add an internal note, and hand ownership on.

def support_account(db: Session) -> User:
    """The single "PromoSlot Support" account every reply is sent as.

    Replies must never appear to come from the individual reviewer who happened
    to claim the ticket, and Message.sender_id has to be a real user — so one
    dedicated system account owns them all. Created on first use; it has no
    usable password because nothing ever logs into it directly.
    """
    u = db.query(User).filter(func.lower(User.email) == settings.support_email.lower()).first()
    if u is not None:
        return u
    u = User(email=settings.support_email.lower(),
             password_hash="!no-login",      # never matches the pbkdf2 format -> unusable
             display_name="PromoSlot Support",
             is_business=False, is_platform_owner=False)
    db.add(u)
    try:
        db.commit()
    except IntegrityError:                   # another request created it first
        db.rollback()
        u = db.query(User).filter(func.lower(User.email) == settings.support_email.lower()).one()
        return u
    db.refresh(u)
    return u


def _support_convo(db: Session, support_id: int, user_id: int, ticket_id: int) -> Conversation:
    """The thread a ticket's replies live in.

    context_ref mirrors the existing "p12"/"c7" convention so the thread stays
    traceable back to the ticket it came from.
    """
    lo, hi = (support_id, user_id) if support_id <= user_id else (user_id, support_id)
    ref = f"support:{ticket_id}"
    convo = db.query(Conversation).filter_by(user_lo=lo, user_hi=hi, context_ref=ref).first()
    if convo is None:
        convo = Conversation(user_lo=lo, user_hi=hi, context_ref=ref)
        db.add(convo)
        db.commit()
        db.refresh(convo)
    return convo


def _reviewer_ids(db: Session):
    """Everyone who can work the queue — the same permission that gates it."""
    roles = [r for r, perms in ROLE_PERMISSIONS.items() if Perm.DEAL_VIEW_EVIDENCE in perms]
    if not roles:
        return []
    rows = (db.query(User.id)
            .filter(User.role.in_(roles),
                    User.suspended_at.is_(None), User.banned_at.is_(None)).all())
    return [r[0] for r in rows]


def _who(u: User):
    if u is None:
        return None
    return {"id": u.id, "name": u.display_name or u.email}


def ticket_dict(t: SupportTicket, events=None) -> dict:
    d = {
        "id": t.id, "user_id": t.user_id, "name": t.name, "email": t.email,
        "mobile": t.mobile, "subject": t.subject, "body": t.body,
        "handled": t.handled, "created_at": t.created_at.isoformat() if t.created_at else None,
        "assigned_to": _who(t.assigned_to),
        "claimed_at": t.claimed_at.isoformat() if t.claimed_at else None,
    }
    if events is not None:
        d["events"] = [{
            "id": e.id, "kind": e.kind, "body": e.body,
            "author": _who(e.author),
            "created_at": e.created_at.isoformat() if e.created_at else None,
        } for e in events]
    return d


def _get_ticket(db: Session, ticket_id: int) -> SupportTicket:
    t = db.get(SupportTicket, ticket_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t


def _log(db: Session, t: SupportTicket, author: User, kind: str, body: str = None):
    db.add(SupportTicketEvent(ticket_id=t.id, author_id=author.id, kind=kind, body=body))


@router.get("/tickets")
def list_tickets(reviewer: User = Depends(get_current_reviewer), db: Session = Depends(get_db)):
    rows = (db.query(SupportTicket)
            .options(selectinload(SupportTicket.assigned_to))
            .order_by(SupportTicket.id.desc()).all())
    return [ticket_dict(t) for t in rows]


@router.get("/tickets/{ticket_id:int}")
def get_ticket(ticket_id: int, reviewer: User = Depends(get_current_reviewer),
               db: Session = Depends(get_db)):
    t = _get_ticket(db, ticket_id)
    events = (db.query(SupportTicketEvent)
              .options(selectinload(SupportTicketEvent.author))
              .filter(SupportTicketEvent.ticket_id == t.id)
              .order_by(SupportTicketEvent.id.asc()).all())
    return ticket_dict(t, events)


@router.post("/tickets/{ticket_id:int}/claim")
def claim_ticket(ticket_id: int, request: Request,
                 reviewer: User = Depends(get_current_reviewer),
                 db: Session = Depends(get_db)):
    """Take ownership — only if nobody holds it yet.

    The guard is the UPDATE's own WHERE clause, so two reviewers claiming at the
    same moment cannot both succeed: exactly one UPDATE matches a row.
    """
    t = _get_ticket(db, ticket_id)
    changed = (db.query(SupportTicket)
               .filter(SupportTicket.id == ticket_id,
                       SupportTicket.assigned_to_id.is_(None))
               .update({"assigned_to_id": reviewer.id, "claimed_at": datetime.utcnow()},
                       synchronize_session=False))
    db.commit()
    if not changed:
        db.refresh(t)
        holder = _who(t.assigned_to)
        raise HTTPException(status_code=409,
                            detail=f"Already claimed by {holder['name'] if holder else 'another reviewer'}.")
    db.refresh(t)
    _log(db, t, reviewer, "claim")
    audit.record(db, actor=reviewer, action="support.claim", target_type="support_ticket",
                 target_id=t.id, previous_state={"assigned_to_id": None},
                 new_state={"assigned_to_id": reviewer.id}, request=request)
    db.commit()
    return ticket_dict(t)


class TransferIn(BaseModel):
    to_user_id: int
    reason: Optional[str] = Field(default=None, max_length=300)


@router.post("/tickets/{ticket_id:int}/transfer")
def transfer_ticket(ticket_id: int, body: TransferIn, request: Request,
                    reviewer: User = Depends(get_current_reviewer),
                    db: Session = Depends(get_db)):
    """Hand ownership to another reviewer. Any reviewer may do this, not just
    the owner — that is how a ticket gets unstuck when its owner is away."""
    t = _get_ticket(db, ticket_id)
    target = db.get(User, body.to_user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="That account doesn't exist")
    if not has_permission(target, Perm.DEAL_VIEW_EVIDENCE):
        raise HTTPException(status_code=422, detail="That account isn't a reviewer")
    before = t.assigned_to_id
    if before == target.id:
        raise HTTPException(status_code=409, detail="They already own this ticket")
    t.assigned_to_id = target.id
    t.claimed_at = datetime.utcnow()
    _log(db, t, reviewer, "transfer",
         f"Ownership transferred to {target.display_name or target.email}"
         + (f" — {body.reason.strip()}" if body.reason and body.reason.strip() else ""))
    audit.record(db, actor=reviewer, action="support.transfer", target_type="support_ticket",
                 target_id=t.id, previous_state={"assigned_to_id": before},
                 new_state={"assigned_to_id": target.id}, reason=body.reason, request=request)
    db.commit()
    db.refresh(t)
    return ticket_dict(t)


class NoteIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


@router.post("/tickets/{ticket_id:int}/note", status_code=201)
def add_note(ticket_id: int, body: NoteIn, request: Request,
             reviewer: User = Depends(get_current_reviewer),
             db: Session = Depends(get_db)):
    """A reviewer-only note. Never emailed, never shown to the submitter."""
    t = _get_ticket(db, ticket_id)
    _log(db, t, reviewer, "note", body.body.strip())
    audit.record(db, actor=reviewer, action="support.note", target_type="support_ticket",
                 target_id=t.id, request=request)
    db.commit()
    return {"ok": True}


class ReplyIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


@router.post("/tickets/{ticket_id:int}/reply", status_code=201)
def reply_to_ticket(ticket_id: int, body: ReplyIn, request: Request,
                    reviewer: User = Depends(get_current_reviewer),
                    db: Session = Depends(get_db)):
    """Send the customer-facing reply. Owner only, enforced here on the server.

    The submitter may not have an account (user_id is nullable), so the reply
    always goes out by email to the address they gave. If they DO have an
    account they also get a real in-app notification.
    """
    t = _get_ticket(db, ticket_id)
    if t.assigned_to_id is None:
        raise HTTPException(status_code=409, detail="Claim this ticket before replying.")
    if t.assigned_to_id != reviewer.id:
        holder = _who(t.assigned_to)
        raise HTTPException(status_code=403,
                            detail=f"Only {holder['name'] if holder else 'the owner'} can reply to this ticket.")
    if not t.email:
        raise HTTPException(status_code=422,
                            detail="This ticket has no email address to reply to.")

    text = body.body.strip()
    subj, html, txt = support_reply_email(t.id, t.subject, text)
    # From the support inbox, not the generic no-reply sender.
    ok, detail = send_email(t.email, subj, html, txt,
                            from_override=settings.support_email)
    if not ok:
        # Nothing is recorded as sent when it wasn't.
        log.warning("support reply not sent for ticket %s: %s", t.id, detail)
        raise HTTPException(status_code=502,
                            detail="The reply could not be emailed. Nothing was recorded as sent.")

    _log(db, t, reviewer, "reply", text)
    t.handled = True
    convo_id = None
    if t.user_id:
        # The submitter has an account, so the same reply becomes a real message
        # thread they can answer in — always sent AS the support account, never
        # as the individual reviewer who happened to claim the ticket.
        sender = support_account(db)
        if sender.id != t.user_id:
            convo = _support_convo(db, sender.id, t.user_id, t.id)
            db.add(Message(conversation_id=convo.id, sender_id=sender.id, body=text))
            convo.last_message_at = datetime.utcnow()
            convo_id = convo.id
        # ref must be a format openNotif() actually routes. "support:{id}" matched
        # none of its cases, so the notification was a dead click; "convo:{id}"
        # opens Messages on the thread with no frontend change.
        db.add(Notification(
            user_id=t.user_id, type="support_reply",
            body=f"PromoSlot Support replied to \"{t.subject}\".",
            ref=f"convo:{convo_id}" if convo_id else None))
    audit.record(db, actor=reviewer, action="support.reply", target_type="support_ticket",
                 target_id=t.id, new_state={"handled": True}, request=request)
    db.commit()
    return {"ok": True, "emailed": t.email, "notified_in_app": bool(t.user_id),
            "conversation_id": convo_id}
