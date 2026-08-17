"""Chargeback disputes — admin-only queue and detail (see services.py header).

Every field here (Stripe dispute id, reason code, evidence deadline,
payout-impact) is admin-only by construction: nothing in this router is ever
called by a business or platform-owner account, and deals.py's deal_dict()
only ever exposes a boolean (payment_dispute_open), never any of this.

Actually responding to a dispute — submitting evidence, accepting it — happens
on Stripe's own dashboard (dispute evidence submission is final; see
https://docs.stripe.com/disputes/api). This router's job is visibility,
ownership and a paper trail, not replacing that flow. "Request information"
is the one two-way action: it logs what was asked and notifies the relevant
party, whose reply comes back through the existing messaging system.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from .. import audit
from ..db import get_db
from ..deps import RequirePerm
from ..models import Dispute, DisputeEvent, Notification, User
from ..permissions import Perm

router = APIRouter(prefix="/disputes", tags=["disputes"])


def _who(u: Optional[User]) -> Optional[dict]:
    if u is None:
        return None
    return {"id": u.id, "name": u.display_name or u.email}


def _get_dispute(db: Session, dispute_id: int) -> Dispute:
    d = db.get(Dispute, dispute_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Dispute not found")
    return d


def _log(db: Session, d: Dispute, author: User, kind: str, body: str = None,
         target_party: str = None) -> None:
    db.add(DisputeEvent(dispute_id=d.id, author_id=author.id, kind=kind, body=body,
                        target_party=target_party))


def dispute_dict(d: Dispute, events=None) -> dict:
    deal = d.deal
    out = {
        "id": d.id,
        "deal_id": d.deal_id,
        "stripe_dispute_id": d.stripe_dispute_id,
        "stripe_url": f"https://dashboard.stripe.com/disputes/{d.stripe_dispute_id}",
        "amount": d.amount,
        "currency": d.currency,
        "reason": d.reason,
        "status": d.status,
        "outcome": d.outcome,
        "evidence_due_by": d.evidence_due_by.isoformat() if d.evidence_due_by else None,
        "payout_already_released": d.payout_already_released,
        "opened_at": d.opened_at.isoformat() if d.opened_at else None,
        "closed_at": d.closed_at.isoformat() if d.closed_at else None,
        "funds_withdrawn_at": d.funds_withdrawn_at.isoformat() if d.funds_withdrawn_at else None,
        "funds_reinstated_at": d.funds_reinstated_at.isoformat() if d.funds_reinstated_at else None,
        "assigned_to": _who(d.assigned_to),
        "claimed_at": d.claimed_at.isoformat() if d.claimed_at else None,
        "deal_status": deal.status if deal else None,
        "business": _who(deal.business) if deal else None,
        "owner": _who(deal.platform_owner) if deal else None,
        "listed_price": deal.listed_price if deal else None,
    }
    if events is not None:
        out["events"] = [{
            "id": e.id, "kind": e.kind, "body": e.body, "target_party": e.target_party,
            "author": _who(e.author),
            "created_at": e.created_at.isoformat() if e.created_at else None,
        } for e in events]
    return out


# ------------------------------------------------------------------ open flag
OPEN_STATUSES = {"warning_needs_response", "warning_under_review", "needs_response", "under_review"}


@router.get("")
def list_disputes(status: Optional[str] = None,
                  admin: User = Depends(RequirePerm(Perm.DISPUTE_MANAGE)),
                  db: Session = Depends(get_db)):
    q = (db.query(Dispute)
         .options(selectinload(Dispute.assigned_to), selectinload(Dispute.deal))
         .order_by(Dispute.id.desc()))
    rows = q.all()
    if status == "open":
        rows = [d for d in rows if d.status in OPEN_STATUSES]
    elif status:
        rows = [d for d in rows if d.status == status]
    return [dispute_dict(d) for d in rows]


@router.get("/{dispute_id:int}")
def get_dispute(dispute_id: int, admin: User = Depends(RequirePerm(Perm.DISPUTE_MANAGE)),
                db: Session = Depends(get_db)):
    d = _get_dispute(db, dispute_id)
    events = (db.query(DisputeEvent)
              .options(selectinload(DisputeEvent.author))
              .filter(DisputeEvent.dispute_id == d.id)
              .order_by(DisputeEvent.id.asc()).all())
    return dispute_dict(d, events)


@router.post("/{dispute_id:int}/claim")
def claim_dispute(dispute_id: int, request: Request,
                  admin: User = Depends(RequirePerm(Perm.DISPUTE_MANAGE)),
                  db: Session = Depends(get_db)):
    """Take ownership — only if nobody holds it yet (same atomic-UPDATE guard
    as support ticket claiming, so two admins racing can't both win)."""
    d = _get_dispute(db, dispute_id)
    changed = (db.query(Dispute)
               .filter(Dispute.id == dispute_id, Dispute.assigned_to_id.is_(None))
               .update({"assigned_to_id": admin.id, "claimed_at": datetime.utcnow()},
                       synchronize_session=False))
    db.commit()
    if not changed:
        db.refresh(d)
        holder = _who(d.assigned_to)
        raise HTTPException(status_code=409,
                            detail=f"Already claimed by {holder['name'] if holder else 'another admin'}.")
    db.refresh(d)
    _log(db, d, admin, "claim")
    audit.record(db, actor=admin, action="dispute.claim", target_type="dispute",
                target_id=d.id, previous_state={"assigned_to_id": None},
                new_state={"assigned_to_id": admin.id}, request=request)
    db.commit()
    return dispute_dict(d)


class NoteIn(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


@router.post("/{dispute_id:int}/note", status_code=201)
def add_note(dispute_id: int, body: NoteIn, request: Request,
            admin: User = Depends(RequirePerm(Perm.DISPUTE_MANAGE)),
            db: Session = Depends(get_db)):
    """Internal note. Never shown to either party."""
    d = _get_dispute(db, dispute_id)
    _log(db, d, admin, "note", body.body.strip())
    audit.record(db, actor=admin, action="dispute.note", target_type="dispute",
                target_id=d.id, request=request)
    db.commit()
    return {"ok": True}


class RequestInfoIn(BaseModel):
    target_party: str = Field(pattern="^(business|owner)$")
    body: str = Field(min_length=1, max_length=2000)


@router.post("/{dispute_id:int}/request-info", status_code=201)
def request_info(dispute_id: int, body: RequestInfoIn, request: Request,
                 admin: User = Depends(RequirePerm(Perm.DISPUTE_MANAGE)),
                 db: Session = Depends(get_db)):
    """Ask a party for something (a message, a deliverable, a screenshot)
    before finalising the response in Stripe. Logged on the dispute and sent
    as a real notification; the reply comes back through Messages, not here —
    this keeps evidence-gathering safe and reviewable rather than automatic,
    since evidence submission to Stripe is final."""
    d = _get_dispute(db, dispute_id)
    deal = d.deal
    if deal is None:
        raise HTTPException(status_code=409, detail="This dispute has no linked deal")
    target_id = deal.business_id if body.target_party == "business" else deal.platform_owner_id
    _log(db, d, admin, "request_info", body.body.strip(), target_party=body.target_party)
    db.add(Notification(
        user_id=target_id, type="dispute_info_requested",
        body=(f"PromoSlot needs more information about deal #{deal.id}'s payment dispute: "
              f"\"{body.body.strip()}\""),
        ref=str(deal.id),
    ))
    audit.record(db, actor=admin, action="dispute.request_info", target_type="dispute",
                target_id=d.id, reason=body.body.strip(), request=request)
    db.commit()
    return {"ok": True}
