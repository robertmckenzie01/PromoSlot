"""Reviewer-only delivery verification.

Verification is a deliberate human action by a PromoSlot reviewer looking at
real submitted evidence. It is never triggered by time passing, by a step being
reached, or by a deal party clicking through their own flow.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_reviewer
from ..models import Deal, DealStatus, Proof, User
from ..services import verify_delivery

router = APIRouter(prefix="/review", tags=["review"])


class VerifyIn(BaseModel):
    decision: str  # "approved" | "rejected"
    notes: Optional[str] = None


@router.get("/queue")
def review_queue(reviewer: User = Depends(get_current_reviewer), db: Session = Depends(get_db)):
    """Funded deals with evidence submitted, awaiting a verification decision."""
    rows = (db.query(Deal)
            .filter(Deal.funded_at.isnot(None), Deal.verified_at.is_(None),
                    Deal.status == DealStatus.PROOF_SUBMITTED)
            .order_by(Deal.id.asc()).all())
    return [{"deal_id": d.id, "business_id": d.business_id,
             "platform_owner_id": d.platform_owner_id,
             "amount_total": d.amount_total, "status": d.status,
             "proof_count": db.query(Proof).filter_by(deal_id=d.id).count()} for d in rows]


@router.post("/deals/{deal_id}/verify")
def verify(deal_id: int, body: VerifyIn,
           reviewer: User = Depends(get_current_reviewer), db: Session = Depends(get_db)):
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=422, detail="decision must be 'approved' or 'rejected'")

    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded")
    if d.verified_at is not None:
        raise HTTPException(status_code=409, detail="Deal already verified")

    # Cannot verify without real evidence to look at.
    real_proofs = db.query(Proof).filter(
        Proof.deal_id == d.id,
        (Proof.stored_path.isnot(None)) | (Proof.url.isnot(None)),
    ).count()
    if real_proofs == 0:
        raise HTTPException(status_code=409, detail="No submitted evidence to verify")

    verify_delivery(db, d, reviewer, body.decision, body.notes)
    return {
        "deal_id": d.id,
        "status": d.status,
        "verified": d.verified_at is not None,
        "decision": body.decision,
    }
