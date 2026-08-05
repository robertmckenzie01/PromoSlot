"""Deals: agreement, both-party approval, and funding.

Money model: separate charges & transfers. Funding creates a PaymentIntent that
charges the business into the PLATFORM balance (the escrow hold). The deal is
marked FUNDED only by the payment_intent.succeeded webhook after Stripe confirms
the charge — never here, never optimistically.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Deal, DealStatus, Notification, Payment, User
from ..services import deal_money_for, mark_deal_funded_from_pi
from ..stripe_client import stripe

router = APIRouter(prefix="/deals", tags=["deals"])


class DealCreateIn(BaseModel):
    platform_owner_id: int
    listed_price: int = Field(ge=100, description="Agreed/listed price, in pence")
    currency: str = "gbp"
    terms: dict = Field(default_factory=dict)


def _name(u) -> str:
    return (u.display_name or u.email) if u else ""


def _source_removed(d: Deal):
    """Was this deal's listing/campaign removed while it was still pre-funding?

    Derived, never stored: it is read from the linked row every time, so it can
    never drift from reality and it disappears by itself if the row is restored.

    Covers every pre-funding stage: an application still awaiting approval is
    just as dead as an approved one once the other side withdraws the listing.
    Gated on funded_at being unset AND a pre-funding status, so once real money
    is in escrow the deal resolves on its own terms no matter what happens to
    the listing it came from.
    """
    if d.funded_at is not None:
        return None
    if d.status not in (DealStatus.AWAITING_APPROVAL, DealStatus.APPROVED,
                        DealStatus.AWAITING_FUNDING):
        return None
    if d.platform is not None and d.platform.removed_at is not None:
        return "listing"
    if d.campaign is not None and d.campaign.removed_at is not None:
        return "campaign"
    return None


def deal_dict(d: Deal) -> dict:
    m = deal_money_for(d)
    return {
        "id": d.id,
        "business_id": d.business_id,
        "platform_owner_id": d.platform_owner_id,
        "currency": d.currency,
        "status": d.status,
        # Split-fee breakdown (all fees on the listed price)
        "listed_price": d.listed_price,
        "seller_fee_percent": d.seller_fee_percent,
        "buyer_fee_percent": d.buyer_fee_percent,
        "buyer_protection_fee": m["buyer_fee"],
        "seller_fee": m["seller_fee"],
        "total_charged": m["charge_amount"],     # what the business pays
        "net_to_owner": m["net_to_owner"],        # what the owner receives
        "platform_take": m["platform_take"],
        "campaign_id": d.campaign_id,
        "platform_id": d.platform_id,
        # Real identities of both parties (never "You"), with refs to their profiles.
        "business_name": _name(d.business),
        "owner_name": _name(d.platform_owner),
        "business_avatar": (f"/users/{d.business_id}/avatar"
                            if (d.business and d.business.avatar_path) else None),
        "owner_avatar": (f"/users/{d.platform_owner_id}/avatar"
                         if (d.platform_owner and d.platform_owner.avatar_path) else None),
        "owner_listing_ref": (f"p{d.platform_id}" if d.platform_id
                              else (d.terms or {}).get("listing_id")),
        "business_approved": d.business_approved,
        "owner_approved": d.owner_approved,
        "funded": d.funded_at is not None,
        "verified": d.verified_at is not None,
        "paid": d.paid_at is not None,
        # Event timestamps for the dashboard growth timeline.
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "funded_at": d.funded_at.isoformat() if d.funded_at else None,
        "paid_at": d.paid_at.isoformat() if d.paid_at else None,
        "payment_intent_id": d.payment_intent_id,
        # "listing" | "campaign" when the other side withdrew what this deal came
        # from before it was funded; None otherwise. Never set once funded.
        "source_removed": _source_removed(d),
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
    # A suspended owner or listing cannot transact.
    if owner.suspended_at is not None or owner.banned_at is not None:
        raise HTTPException(status_code=409, detail="That platform owner is not currently available.")
    listing_ref = (body.terms or {}).get("listing_id")
    if listing_ref and str(listing_ref).startswith("p"):
        from ..models import Platform as _P
        _p = db.get(_P, int(str(listing_ref)[1:]))
        if _p is not None and _p.suspended_at is not None:
            raise HTTPException(status_code=409, detail="That listing is suspended and cannot be booked.")
        if _p is not None and _p.removed_at is not None:
            raise HTTPException(status_code=409,
                                detail="That listing has been removed by its owner and cannot be booked.")

    d = Deal(
        business_id=user.id,
        platform_owner_id=owner.id,
        listed_price=body.listed_price,
        currency=body.currency.lower(),
        seller_fee_percent=settings.seller_fee_percent,
        buyer_fee_percent=settings.buyer_fee_percent,
        terms=body.terms,
        status=DealStatus.AWAITING_APPROVAL,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return deal_dict(d)


@router.get("")
def list_deals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # selectinload: _source_removed() reads d.platform / d.campaign, which would
    # otherwise lazy-load one query per unfunded deal.
    rows = (db.query(Deal)
            .options(selectinload(Deal.platform), selectinload(Deal.campaign),
                     selectinload(Deal.business), selectinload(Deal.platform_owner))
            .filter((Deal.business_id == user.id) | (Deal.platform_owner_id == user.id))
            .order_by(Deal.id.desc()).all())
    return [deal_dict(d) for d in rows]


@router.get("/{deal_id}")
def get_deal(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    # Parties can view; admins with evidence-review rights can view read-only.
    from ..permissions import Perm, has_permission
    if (user.id not in (d.business_id, d.platform_owner_id)
            and not has_permission(user, Perm.DEAL_VIEW_EVIDENCE)):
        raise HTTPException(status_code=403, detail="Not a party to this deal")
    return deal_dict(d)


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

    # Tell the other side. Without this an approval is invisible unless they
    # happen to reopen the deal.
    other_id = d.platform_owner_id if user.id == d.business_id else d.business_id
    if d.status == DealStatus.APPROVED:
        # This was the second approval — say what happens next, which differs
        # depending on which side is being told.
        body = (f"Deal #{d.id} is fully approved — fund it to start the work."
                if other_id == d.business_id
                else f"Deal #{d.id} is fully approved. Waiting on the business to fund it.")
    else:
        body = f"{_name(user)} approved deal #{d.id} — your approval is next."
    db.add(Notification(user_id=other_id, type="deal_approved", body=body, ref=str(d.id)))

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
    # The listing/campaign this deal came from was withdrawn before it was funded.
    # Enforced here, not just hidden in the UI: this is the money path.
    gone = _source_removed(d)
    if gone is not None:
        raise HTTPException(
            status_code=409,
            detail=(f"The {gone} this deal came from has been removed by "
                    f"{'the business' if gone == 'campaign' else 'the owner'}. "
                    "This deal can no longer be funded."))

    m = deal_money_for(d)  # listed price + 5% buyer protection fee = amount charged

    # Reuse an existing pending PaymentIntent if one was already created.
    if d.payment_intent_id:
        try:
            pi = stripe.PaymentIntent.retrieve(d.payment_intent_id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    else:
        try:
            pi = stripe.PaymentIntent.create(
                amount=m["charge_amount"],
                currency=d.currency,
                # Payment methods (product decision): card + Apple Pay + Google Pay.
                # Apple/Google Pay are wallets that tokenize into CARD payments, so
                # "card" covers all three and they reconcile identically (card rails,
                # into the platform balance). PayPal is intentionally excluded (it's a
                # separate rail that would complicate escrow reconciliation).
                # P7 surfaces the wallet buttons via the Express Checkout / Payment
                # Element + Apple Pay domain verification — no change to this flow.
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
            amount=m["charge_amount"],
            currency=d.currency,
            status=pi.status,
        ))
        db.commit()

    return {
        "deal_id": d.id,
        "client_secret": pi.client_secret,
        "publishable_key": settings.stripe_publishable_key,
        "currency": d.currency,
        "status": pi.status,
        # Checkout line items — shown separately, never folded into one number.
        "line_items": [
            {"label": "Listed price", "amount": m["listed_price"]},
            {"label": f"Buyer protection fee ({d.buyer_fee_percent}%)", "amount": m["buyer_fee"]},
        ],
        "total_charged": m["charge_amount"],
    }


@router.post("/{deal_id}/refresh")
def refresh_deal(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Reconcile funding with Stripe after a client-side confirmation.

    In production the payment_intent.succeeded webhook marks the deal funded.
    This endpoint lets the client trigger the SAME real re-verification (retrieve
    the PaymentIntent from Stripe; fund only if status == 'succeeded'), which is
    also a robust fallback if a webhook is delayed. Never simulates funding.
    """
    d = _get_party_deal(db, deal_id, user)
    if d.payment_intent_id and d.funded_at is None:
        mark_deal_funded_from_pi(db, d.payment_intent_id)
        db.refresh(d)
    return deal_dict(d)


@router.post("/{deal_id}/decline")
def decline_deal(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Decline/cancel a deal before any money is committed. Either party may do so.

    Used to turn down a campaign application (or back out of a proposal) while it's
    still unfunded. A funded deal can't be cancelled this way — those resolve
    through verification or a refund, never by silently dropping the agreement.
    """
    d = _get_party_deal(db, deal_id, user)
    if d.funded_at is not None:
        raise HTTPException(status_code=409, detail="A funded deal can't be declined; it resolves via verification or refund")
    if d.status in (DealStatus.CANCELLED, DealStatus.REFUNDED):
        return deal_dict(d)
    d.status = DealStatus.CANCELLED
    other_id = d.platform_owner_id if user.id == d.business_id else d.business_id
    db.add(Notification(user_id=other_id, type="deal_declined",
                        body=f"Deal #{d.id} was declined.", ref=str(d.id)))
    db.commit()
    db.refresh(d)
    return deal_dict(d)
