"""Contact Support — real tickets stored server-side (admin/reviewer visible).

Submissions are persisted to the support_tickets table so they can be acted on
(and emailed out once SMTP is configured). Never a fire-and-forget success.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_reviewer, get_current_user_optional
from ..models import SupportTicket, User

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
def create_ticket(body: TicketIn, request: Request, db: Session = Depends(get_db),
                  user: Optional[User] = Depends(get_current_user_optional)):
    t = SupportTicket(
        user_id=user.id if user else None,
        name=body.name.strip(), email=_clean(body.email), mobile=_clean(body.mobile),
        subject=body.subject.strip(), body=body.body.strip(),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    # TODO: when SMTP is configured, also email the support inbox to notify staff.
    return {"id": t.id, "ok": True}


@router.get("/tickets")
def list_tickets(reviewer: User = Depends(get_current_reviewer), db: Session = Depends(get_db)):
    rows = db.query(SupportTicket).order_by(SupportTicket.id.desc()).all()
    return [{
        "id": t.id, "user_id": t.user_id, "name": t.name, "email": t.email,
        "mobile": t.mobile, "subject": t.subject, "body": t.body,
        "handled": t.handled, "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in rows]
