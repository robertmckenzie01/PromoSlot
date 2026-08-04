"""Contact Support — real tickets stored server-side (admin/reviewer visible).

Submissions are persisted to the support_tickets table AND alerted to the
support inbox by email. Never a fire-and-forget success.
"""
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_reviewer, get_current_user_optional
from ..mailer import send_email, support_ticket_email
from ..models import SupportTicket, User

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
    return {"id": t.id, "ok": True}


def _alert_support_inbox(ticket_id: int, name: str, email: str, mobile: str,
                         subject: str, body: str) -> None:
    subj, html, text = support_ticket_email(ticket_id, name, email, mobile, subject, body)
    ok, detail = send_email(settings.support_email, subj, html, text)
    if not ok:
        # Logged, never surfaced to the submitter and never treated as delivered.
        log.warning("support alert not sent for ticket %s: %s", ticket_id, detail)


@router.get("/tickets")
def list_tickets(reviewer: User = Depends(get_current_reviewer), db: Session = Depends(get_db)):
    rows = db.query(SupportTicket).order_by(SupportTicket.id.desc()).all()
    return [{
        "id": t.id, "user_id": t.user_id, "name": t.name, "email": t.email,
        "mobile": t.mobile, "subject": t.subject, "body": t.body,
        "handled": t.handled, "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in rows]
