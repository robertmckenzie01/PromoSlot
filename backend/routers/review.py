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
from ..models import ConnectedAccount, Deal, DealStatus, Proof, User
from ..services import (
    create_deal_payout, deal_money_for, onboarding_complete, refund_deal,
    sync_connected_account, verify_delivery,
)
from ..stripe_client import client

router = APIRouter(prefix="/review", tags=["review"])

_INCLUDE = ["configuration.recipient", "requirements", "identity"]


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
             "listed_price": d.listed_price, "status": d.status,
             "proof_count": db.query(Proof).filter_by(deal_id=d.id).count()} for d in rows]


@router.get("/payouts")
def payout_queue(reviewer: User = Depends(get_current_reviewer), db: Session = Depends(get_db)):
    """Verified deals not yet paid out (or refunded) — awaiting a deliberate payout.

    A deal stays here after verification until the reviewer actually releases the
    payout (or refunds), so a verified-but-unpaid deal is never lost from view.
    """
    rows = (db.query(Deal)
            .filter(Deal.verified_at.isnot(None), Deal.paid_at.is_(None),
                    Deal.status != DealStatus.REFUNDED)
            .order_by(Deal.verified_at.asc()).all())
    out = []
    for d in rows:
        owner = db.get(User, d.platform_owner_id)
        ca = db.query(ConnectedAccount).filter_by(user_id=d.platform_owner_id).first()
        m = deal_money_for(d)
        out.append({
            "deal_id": d.id,
            "owner": owner.display_name if owner else "",
            "listed_price": d.listed_price,
            "net_to_owner": m["net_to_owner"],
            "status": d.status,
            "payout_ready": bool(ca and ca.transfers_active),
        })
    return out


@router.get("/completed")
def completed_deals(reviewer: User = Depends(get_current_reviewer), db: Session = Depends(get_db)):
    """Historical completed (paid-out) deals — admin record-keeping."""
    rows = (db.query(Deal).filter(Deal.paid_at.isnot(None))
            .order_by(Deal.paid_at.desc()).all())
    out = []
    for d in rows:
        biz = db.get(User, d.business_id)
        owner = db.get(User, d.platform_owner_id)
        m = deal_money_for(d)
        out.append({
            "deal_id": d.id,
            "business": (biz.display_name or biz.email) if biz else "",
            "owner": (owner.display_name or owner.email) if owner else "",
            "listed_price": d.listed_price,
            "total_charged": m["charge_amount"],
            "net_to_owner": m["net_to_owner"],
            "platform_take": m["platform_take"],
            "transfer_id": d.transfer_id,
            "paid_at": d.paid_at.isoformat() if d.paid_at else None,
        })
    return out


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


@router.post("/deals/{deal_id}/release")
def release_payout(deal_id: int, reviewer: User = Depends(get_current_reviewer),
                   db: Session = Depends(get_db)):
    """Release the escrow to the platform owner via a real Stripe Transfer.

    Gated on: funded, verified, not already paid/refunded, and the owner's
    connected account payout-enabled (checked live against Stripe). The deal is
    marked PAID only because the transfer call actually succeeds.
    """
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded")
    if d.verified_at is None:
        raise HTTPException(status_code=409, detail="Deal is not verified")
    if d.paid_at is not None:
        raise HTTPException(status_code=409, detail="Deal already paid out")
    if d.status == DealStatus.REFUNDED:
        raise HTTPException(status_code=409, detail="Deal was refunded")

    ca = db.query(ConnectedAccount).filter_by(user_id=d.platform_owner_id).first()
    if ca is None:
        raise HTTPException(status_code=409, detail="Platform owner has not connected a payout account")

    # Re-check payout capability live before moving money.
    try:
        acct = client.v2.core.accounts.retrieve(ca.stripe_account_id, {"include": _INCLUDE})
        ca = sync_connected_account(db, acct) or ca
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error checking payout account: {e}")
    if not onboarding_complete(ca):
        raise HTTPException(status_code=409,
                            detail="Platform owner's payouts are not enabled yet (onboarding incomplete)")

    m = deal_money_for(d)
    try:
        tr = create_deal_payout(db, d, ca.stripe_account_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe transfer failed: {e}")

    return {
        "deal_id": d.id,
        "status": d.status,
        "paid": d.paid_at is not None,
        "transfer_id": tr.id,
        # Payout breakdown (split-fee)
        "listed_price": m["listed_price"],
        "seller_fee_percent": d.seller_fee_percent,
        "seller_fee": m["seller_fee"],
        "net_to_owner": m["net_to_owner"],
        "buyer_fee": m["buyer_fee"],
        "platform_take": m["platform_take"],
    }


@router.post("/deals/{deal_id}/refund")
def refund(deal_id: int, reviewer: User = Depends(get_current_reviewer),
           db: Session = Depends(get_db)):
    """Refund the business (e.g. delivery not verified). Real Stripe Refund."""
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded — nothing to refund")
    if d.paid_at is not None:
        raise HTTPException(status_code=409, detail="Deal already paid out — cannot refund")
    if d.status == DealStatus.REFUNDED:
        raise HTTPException(status_code=409, detail="Deal already refunded")

    try:
        rf = refund_deal(db, d)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe refund failed: {e}")

    return {"deal_id": d.id, "status": d.status, "refund_id": rf.id}
