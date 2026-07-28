"""Delivery review and payout — permission-gated, state-machine controlled.

Verification is a deliberate human action by a PromoSlot admin looking at real
submitted evidence. It is never triggered by time passing, a step being reached,
or a deal party clicking through their own flow.

`deal.verify` and `payout.release` are deliberately separate permissions, so a
finance-only role can be introduced later without redesigning this.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import audit
from ..config import settings
from ..db import get_db
from ..deps import RequirePerm, get_current_user
from ..deal_state import assert_not_final, assert_payout_eligible, assert_transition
from ..models import ConnectedAccount, Deal, DealStatus, Proof, User
from ..permissions import Perm, is_super_admin
from ..services import (create_deal_payout, deal_money_for, onboarding_complete,
                        refund_deal, sync_connected_account, verify_delivery)
from ..stripe_client import client

router = APIRouter(prefix="/review", tags=["review"])

_INCLUDE = ["configuration.recipient", "requirements", "identity"]


class VerifyIn(BaseModel):
    decision: str                                    # "approved" | "rejected" | "changes_requested"
    notes: Optional[str] = None
    reason: str = Field(min_length=3, max_length=1000)
    evidence_reviewed: bool = False                  # explicit confirmation


class ReleaseIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    evidence_reviewed: bool = False


def _deal_or_404(db: Session, deal_id: int) -> Deal:
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return d


def _assert_not_party(actor: User, d: Deal) -> None:
    """Conflict of interest: never review or pay out your own deal."""
    if actor.id in (d.business_id, d.platform_owner_id):
        raise HTTPException(
            status_code=403,
            detail="Conflict of interest: you are a party to this deal.")


def _deal_snapshot(d: Deal) -> dict:
    return {"status": d.status, "listed_price": d.listed_price,
            "verified": d.verified_at is not None, "paid": d.paid_at is not None}


@router.get("/queue")
def review_queue(reviewer: User = Depends(RequirePerm(Perm.DEAL_VIEW_EVIDENCE)),
                 db: Session = Depends(get_db)):
    """Funded deals with evidence submitted, awaiting a verification decision."""
    rows = (db.query(Deal)
            .filter(Deal.funded_at.isnot(None), Deal.verified_at.is_(None),
                    Deal.status.in_([DealStatus.PROOF_SUBMITTED, DealStatus.UNDER_REVIEW]))
            .order_by(Deal.id.asc()).all())
    return [{"deal_id": d.id, "business_id": d.business_id,
             "platform_owner_id": d.platform_owner_id,
             "listed_price": d.listed_price, "status": d.status,
             "is_party": reviewer.id in (d.business_id, d.platform_owner_id),
             "proof_count": db.query(Proof).filter_by(deal_id=d.id).count()} for d in rows]


@router.get("/payouts")
def payout_queue(reviewer: User = Depends(RequirePerm(Perm.DEAL_VIEW_EVIDENCE)),
                 db: Session = Depends(get_db)):
    """Verified deals not yet paid out — eligible for payout."""
    rows = (db.query(Deal)
            .filter(Deal.verified_at.isnot(None), Deal.paid_at.is_(None),
                    Deal.status == DealStatus.VERIFIED)
            .order_by(Deal.verified_at.asc()).all())
    out = []
    for d in rows:
        owner = db.get(User, d.platform_owner_id)
        ca = db.query(ConnectedAccount).filter_by(user_id=d.platform_owner_id).first()
        m = deal_money_for(d)
        needs_super = m["net_to_owner"] > settings.payout_admin_limit_pence
        out.append({
            "deal_id": d.id,
            "owner": owner.display_name if owner else "",
            "listed_price": d.listed_price,
            "net_to_owner": m["net_to_owner"],
            "status": d.status,
            "payout_ready": bool(ca and ca.transfers_active),
            "requires_super_admin": needs_super,
            "is_party": reviewer.id in (d.business_id, d.platform_owner_id),
        })
    return out


@router.get("/completed")
def completed_deals(reviewer: User = Depends(RequirePerm(Perm.DEAL_VIEW_EVIDENCE)),
                    db: Session = Depends(get_db)):
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
def verify(deal_id: int, body: VerifyIn, request: Request,
           reviewer: User = Depends(RequirePerm(Perm.DEAL_VERIFY)),
           db: Session = Depends(get_db)):
    """Record a verification decision. Never moves money."""
    if body.decision not in ("approved", "rejected", "changes_requested"):
        raise HTTPException(status_code=422,
                            detail="decision must be 'approved', 'rejected' or 'changes_requested'")
    if body.decision in ("rejected", "changes_requested"):
        # Rejecting is a distinct permission from approving.
        from ..permissions import require_permission
        require_permission(reviewer, Perm.DEAL_REJECT)
    if not body.evidence_reviewed:
        raise HTTPException(status_code=422,
                            detail="You must confirm you reviewed the delivery evidence.")

    d = _deal_or_404(db, deal_id)
    _assert_not_party(reviewer, d)
    assert_not_final(d)
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded")
    if d.verified_at is not None:
        raise HTTPException(status_code=409, detail="Deal already verified")

    real_proofs = db.query(Proof).filter(
        Proof.deal_id == d.id,
        (Proof.stored_path.isnot(None)) | (Proof.url.isnot(None)),
    ).count()
    if real_proofs == 0:
        raise HTTPException(status_code=409, detail="No submitted evidence to verify")

    target = {"approved": DealStatus.VERIFIED,
              "rejected": DealStatus.REJECTED,
              "changes_requested": DealStatus.CHANGES_REQUESTED}[body.decision]
    assert_transition(d.status, target)

    before = _deal_snapshot(d)
    if body.decision == "approved":
        verify_delivery(db, d, reviewer, "approved", body.notes)
    else:
        verify_delivery(db, d, reviewer, "rejected", body.notes)
        d.status = target                 # rejected vs changes_requested
        db.commit()
        db.refresh(d)

    audit.record(db, actor=reviewer,
                 action=f"deal.{'verify' if body.decision == 'approved' else 'reject'}",
                 target_type="deal", target_id=d.id, previous_state=before,
                 new_state=_deal_snapshot(d), reason=body.reason, request=request)
    return {"deal_id": d.id, "status": d.status,
            "verified": d.verified_at is not None, "decision": body.decision}


@router.post("/deals/{deal_id}/release")
def release_payout(deal_id: int, body: ReleaseIn, request: Request,
                   reviewer: User = Depends(RequirePerm(Perm.PAYOUT_RELEASE)),
                   db: Session = Depends(get_db)):
    """Release escrow to the platform owner via a real Stripe Transfer.

    Gated on: verified state, not already paid, payouts enabled on the owner's
    connected account (checked live), the admin is not a party to the deal, and
    — above the configured threshold — Super-Admin authority. The payout amount
    is derived from the deal's locked terms; it can never be edited here.
    """
    if not body.evidence_reviewed:
        raise HTTPException(status_code=422,
                            detail="You must confirm you reviewed the delivery evidence.")
    d = _deal_or_404(db, deal_id)
    _assert_not_party(reviewer, d)
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded")
    assert_payout_eligible(d)
    assert_transition(d.status, DealStatus.PAID)

    m = deal_money_for(d)
    if m["net_to_owner"] > settings.payout_admin_limit_pence and not is_super_admin(reviewer):
        raise HTTPException(
            status_code=403,
            detail=(f"Payouts above £{settings.payout_admin_limit_pence/100:,.2f} "
                    "require Super-Admin approval."))

    ca = db.query(ConnectedAccount).filter_by(user_id=d.platform_owner_id).first()
    if ca is None:
        raise HTTPException(status_code=409, detail="Platform owner has not connected a payout account")
    try:
        acct = client.v2.core.accounts.retrieve(ca.stripe_account_id, {"include": _INCLUDE})
        ca = sync_connected_account(db, acct) or ca
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error checking payout account: {e}")
    if not onboarding_complete(ca):
        raise HTTPException(status_code=409,
                            detail="Platform owner's payouts are not enabled yet (onboarding incomplete)")

    before = _deal_snapshot(d)
    try:
        tr = create_deal_payout(db, d, ca.stripe_account_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe transfer failed: {e}")

    audit.record(db, actor=reviewer, action="payout.release", target_type="deal",
                 target_id=d.id, previous_state=before, new_state=_deal_snapshot(d),
                 reason=body.reason, request=request)
    return {
        "deal_id": d.id, "status": d.status, "paid": d.paid_at is not None,
        "transfer_id": tr.id,
        "listed_price": m["listed_price"], "seller_fee_percent": d.seller_fee_percent,
        "seller_fee": m["seller_fee"], "net_to_owner": m["net_to_owner"],
        "buyer_fee": m["buyer_fee"], "platform_take": m["platform_take"],
    }


@router.post("/deals/{deal_id}/refund")
def refund(deal_id: int, body: ReleaseIn, request: Request,
           reviewer: User = Depends(RequirePerm(Perm.DEAL_REJECT)),
           db: Session = Depends(get_db)):
    """Refund the business (delivery not verified). Real Stripe Refund."""
    d = _deal_or_404(db, deal_id)
    _assert_not_party(reviewer, d)
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded — nothing to refund")
    if d.paid_at is not None:
        raise HTTPException(status_code=409, detail="Deal already paid out — cannot refund")
    if d.status == DealStatus.REFUNDED:
        raise HTTPException(status_code=409, detail="Deal already refunded")
    assert_transition(d.status, DealStatus.REFUNDED)

    before = _deal_snapshot(d)
    try:
        rf = refund_deal(db, d)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe refund failed: {e}")
    audit.record(db, actor=reviewer, action="deal.refund", target_type="deal",
                 target_id=d.id, previous_state=before, new_state=_deal_snapshot(d),
                 reason=body.reason, request=request)
    return {"deal_id": d.id, "status": d.status, "refund_id": rf.id}
