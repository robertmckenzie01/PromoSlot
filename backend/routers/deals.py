"""Deals: agreement, both-party approval, and funding.

Money model: separate charges & transfers. Funding creates a PaymentIntent that
charges the business into the PLATFORM balance (the escrow hold). The deal is
marked FUNDED only by the payment_intent.succeeded webhook after Stripe confirms
the charge — never here, never optimistically.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Deal, DealStatus, Payment, User
from ..stripe_client import stripe

router = APIRouter(prefix="/deals", tags=["deals"])


class DealCreateIn(BaseModel):
    platform_owner_id: int
    amount_total: int = Field(ge=100, description="Total the business pays, in pence")
    currency: str = "gbp"
    terms: dict = Field(default_factory=dict)


def deal_dict(d: Deal) -> dict:
    return {
        "id": d.id,
        "business_id": d.business_id,
        "platform_owner_id": d.platform_owner_id,
        "amount_total": d.amount_total,
        "currency": d.currency,
        "fee_percent": d.fee_percent,
        "status": d.status,
        "business_approved": d.business_approved,
        "owner_approved": d.owner_approved,
        "funded": d.funded_at is not None,
        "verified": d.verified_at is not None,
        "paid": d.paid_at is not None,
        "payment_intent_id": d.payment_intent_id,
        "terms": d.terms,
    }


def _get_party_deal(db: Session, deal_id: int, user: User) -> Deal:
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if user.id not in (d.business_id, d.platform_owner_id):
        raise HTTPException(status_code=403, detail="Not a party to this deal")
    return d


@router.post("", status_code=201)
def create_deal(body: DealCreateIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if not user.is_business:
        raise HTTPException(status_code=403, detail="Only a business can open a deal")
    owner = db.get(User, body.platform_owner_id)
    if owner is None or not owner.is_platform_owner:
        raise HTTPException(status_code=404, detail="Platform owner not found")
    if owner.id == user.id:
        raise HTTPException(status_code=422, detail="Cannot open a deal with yourself")

    d = Deal(
        business_id=user.id,
        platform_owner_id=owner.id,
        amount_total=body.amount_total,
        currency=body.currency.lower(),
        fee_percent=settings.platform_fee_percent,
        terms=body.terms,
        status=DealStatus.AWAITING_APPROVAL,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return deal_dict(d)


@router.get("")
def list_deals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (db.query(Deal)
            .filter((Deal.business_id == user.id) | (Deal.platform_owner_id == user.id))
            .order_by(Deal.id.desc()).all())
    return [deal_dict(d) for d in rows]


@router.get("/{deal_id}")
def get_deal(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return deal_dict(_get_party_deal(db, deal_id, user))


@router.post("/{deal_id}/approve")
def approve_deal(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = _get_party_deal(db, deal_id, user)
    if d.funded_at is not None:
        raise HTTPException(status_code=409, detail="Deal already funded")
    if user.id == d.business_id:
        d.business_approved = True
    if user.id == d.platform_owner_id:
        d.owner_approved = True
    if d.business_approved and d.owner_approved and d.status == DealStatus.AWAITING_APPROVAL:
        d.status = DealStatus.APPROVED
    db.commit()
    db.refresh(d)
    return deal_dict(d)


@router.post("/{deal_id}/fund")
def fund_deal(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create (or reuse) the PaymentIntent for this deal. Business only.

    Returns the client_secret so the business completes payment with Stripe.js.
    The deal is funded only once the payment_intent.succeeded webhook confirms it.
    """
    d = _get_party_deal(db, deal_id, user)
    if user.id != d.business_id:
        raise HTTPException(status_code=403, detail="Only the business funds the deal")
    if d.funded_at is not None:
        raise HTTPException(status_code=409, detail="Deal already funded")
    if not (d.business_approved and d.owner_approved):
        raise HTTPException(status_code=409, detail="Both parties must approve before funding")

    # Reuse an existing pending PaymentIntent if one was already created.
    if d.payment_intent_id:
        try:
            pi = stripe.PaymentIntent.retrieve(d.payment_intent_id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    else:
        try:
            pi = stripe.PaymentIntent.create(
                amount=d.amount_total,
                currency=d.currency,
                payment_method_types=["card"],
                # No transfer_data/on_behalf_of: funds sit in the PLATFORM balance
                # (the escrow hold). The owner is paid by a later Transfer.
                metadata={"deal_id": str(d.id), "promoslot": "deal_funding"},
                description=f"PromoSlot deal #{d.id}",
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
        d.payment_intent_id = pi.id
        d.status = DealStatus.AWAITING_FUNDING
        db.add(Payment(
            deal_id=d.id,
            stripe_payment_intent_id=pi.id,
            amount=d.amount_total,
            currency=d.currency,
            status=pi.status,
        ))
        db.commit()

    return {
        "deal_id": d.id,
        "client_secret": pi.client_secret,
        "publishable_key": settings.stripe_publishable_key,
        "amount": d.amount_total,
        "currency": d.currency,
        "status": pi.status,
    }
