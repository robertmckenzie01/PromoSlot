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
from ..deal_state import assert_transition, can_transition
from ..deps import get_current_user
from ..models import ConnectedAccount, Deal, DealStatus, Notification, Payment, User
from ..services import (
    deal_money, deal_money_for, delivery_checklist_for, mark_deal_funded_from_pi,
    total_charge_for, try_instant_payout,
)
from ..stripe_client import stripe

router = APIRouter(prefix="/deals", tags=["deals"])

PRICING_MODELS = ("fixed", "per_view", "per_impression")
POOL_MODELS = ("per_view", "per_impression")
MIN_CAMPAIGN_DAYS = 1
MAX_CAMPAIGN_DAYS = 60


def validate_pricing_fields(pricing_model: str, listed_price: int,
                            rate_unit_pence: Optional[int], rate_unit_quantity: Optional[int],
                            pool_max_budget: Optional[int],
                            campaign_duration_days: Optional[int]) -> None:
    """Shared money-shape validation for every path that can originate a real
    Deal: a business buying a listing (create_deal below) and a platform owner
    applying to a campaign (routers/campaigns.py — the owner originates the
    Deal there, proposing these same fields for the business to approve).
    Raises HTTPException(422) on any invalid combination; returns nothing on success.
    """
    if pricing_model not in PRICING_MODELS:
        raise HTTPException(status_code=422,
                            detail=f"pricing_model must be one of {PRICING_MODELS}")
    if pricing_model == "fixed":
        if listed_price < 100:
            raise HTTPException(status_code=422, detail="listed_price must be at least 100 (£1.00)")
        if any([rate_unit_pence, rate_unit_quantity, pool_max_budget, campaign_duration_days]):
            raise HTTPException(status_code=422,
                                detail="A fixed-price deal can't also carry pool fields")
    else:  # per_view / per_impression
        if listed_price != 0 and listed_price < 100:
            raise HTTPException(status_code=422,
                                detail="listed_price must be 0 (no fixed floor) or at least 100 (£1.00)")
        missing = [name for name, val in
                  [("rate_unit_pence", rate_unit_pence),
                   ("rate_unit_quantity", rate_unit_quantity),
                   ("pool_max_budget", pool_max_budget),
                   ("campaign_duration_days", campaign_duration_days)]
                  if val is None]
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"{pricing_model} deals require: {', '.join(missing)}")


class DealCreateIn(BaseModel):
    platform_owner_id: int
    # 0 is only valid for a pure per_view/per_impression deal with no fixed
    # floor — see the "0 or >=100" check in create_deal(). A plain "fixed"
    # deal still requires >=100 exactly as before; that's enforced there too
    # since it depends on pricing_model, not expressible as a single Field().
    listed_price: int = Field(ge=0, description="Agreed/listed price, in pence — "
                              "0 only allowed alongside a pool with no fixed floor")
    currency: str = "gbp"
    terms: dict = Field(default_factory=dict)

    # Composable pricing (see Deal.pricing_model in models.py for why "hybrid"
    # is deliberately not its own value here — it's just this model with
    # listed_price also >0). All four below are required together, only for
    # pricing_model in ("per_view", "per_impression"); ignored for "fixed".
    pricing_model: str = "fixed"
    rate_unit_pence: Optional[int] = Field(default=None, ge=1)
    rate_unit_quantity: Optional[int] = Field(default=None, ge=1)
    pool_max_budget: Optional[int] = Field(default=None, ge=100)
    campaign_duration_days: Optional[int] = Field(default=None, ge=MIN_CAMPAIGN_DAYS, le=MAX_CAMPAIGN_DAYS)


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
        "net_to_owner": m["net_to_owner"],        # fixed-portion payout only — see pool_* below for the rest
        "platform_take": m["platform_take"],
        # Pool/hybrid pricing (see Deal.pricing_model in models.py — "hybrid"
        # is just this with listed_price also >0, not a separate value).
        # None/0 for a plain fixed deal, so existing callers reading only the
        # fields above are completely unaffected.
        "pricing_model": d.pricing_model,
        "rate_unit_pence": d.rate_unit_pence,
        "rate_unit_quantity": d.rate_unit_quantity,
        "pool_max_budget": d.pool_max_budget,
        "campaign_duration_days": d.campaign_duration_days,
        "campaign_starts_at": d.campaign_starts_at.isoformat() if d.campaign_starts_at else None,
        "campaign_ends_at": d.campaign_ends_at.isoformat() if d.campaign_ends_at else None,
        "pool_released_amount": d.pool_released_amount,
        "pool_refunded_amount": d.pool_refunded_amount,
        # Set only while a reviewer has opened a 24h proof-update grace
        # period (suspected underdelivery on a pool deal) — see
        # services.open_proof_grace_period. None for every ordinary deal.
        "proof_grace_deadline": d.proof_grace_deadline.isoformat() if d.proof_grace_deadline else None,
        "total_charged": total_charge_for(d)["total_charge"],   # fixed + pool combined, what the business pays
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
        # Instant Payout detail — None means "standard scheduled payout" (the
        # default). Set only after a real Stripe Instant Payout succeeded.
        "instant_paid": d.instant_payout_id is not None,
        "instant_net_amount": d.instant_net_amount,
        # Read-only for both parties — never the Stripe dispute id, reason
        # code, evidence deadline or accept/challenge state (admin-only, see
        # routers/disputes.py). Just "is there an open case right now".
        "payment_dispute_open": d.dispute_status is not None,
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
    listing_platform_id = None
    if listing_ref and str(listing_ref).startswith("p"):
        from ..models import Platform as _P
        _p = db.get(_P, int(str(listing_ref)[1:]))
        if _p is not None and _p.suspended_at is not None:
            raise HTTPException(status_code=409, detail="That listing is suspended and cannot be booked.")
        if _p is not None and _p.removed_at is not None:
            raise HTTPException(status_code=409,
                                detail="That listing has been removed by its owner and cannot be booked.")
        # Deal.platform_id was previously never set on this path even though
        # the listing is already looked up right here — left the FK null on
        # every direct-invite deal, silently degrading anything that reads
        # deal.platform (e.g. the Delivery Checklist's platform-specific
        # wording) to its generic fallback. Reuse the lookup we already did.
        if _p is not None:
            listing_platform_id = _p.id

    validate_pricing_fields(body.pricing_model, body.listed_price, body.rate_unit_pence,
                            body.rate_unit_quantity, body.pool_max_budget,
                            body.campaign_duration_days)

    d = Deal(
        business_id=user.id,
        platform_owner_id=owner.id,
        platform_id=listing_platform_id,
        listed_price=body.listed_price,
        currency=body.currency.lower(),
        seller_fee_percent=settings.seller_fee_percent,
        buyer_fee_percent=settings.buyer_fee_percent,
        terms=body.terms,
        status=DealStatus.AWAITING_APPROVAL,
        pricing_model=body.pricing_model,
        rate_unit_pence=body.rate_unit_pence,
        rate_unit_quantity=body.rate_unit_quantity,
        pool_max_budget=body.pool_max_budget,
        campaign_duration_days=body.campaign_duration_days,
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


@router.get("/{deal_id}/delivery-checklist")
def get_delivery_checklist(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    # Same viewing rule as the deal itself: both parties, plus evidence-review admins.
    from ..permissions import Perm, has_permission
    if (user.id not in (d.business_id, d.platform_owner_id)
            and not has_permission(user, Perm.DEAL_VIEW_EVIDENCE)):
        raise HTTPException(status_code=403, detail="Not a party to this deal")
    return {"deal_id": d.id, "items": delivery_checklist_for(d)}


@router.post("/{deal_id}/approve")
def approve_deal(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = _get_party_deal(db, deal_id, user)
    if d.funded_at is not None:
        raise HTTPException(status_code=409, detail="Deal already funded")
    if user.id == d.business_id:
        d.business_approved = True
    if user.id == d.platform_owner_id:
        d.owner_approved = True
    # can_transition (not a hardcoded == AWAITING_APPROVAL check) so this
    # reads from the same single source of truth as every other transition
    # site — see deal_state.py.
    if d.business_approved and d.owner_approved and can_transition(d.status, DealStatus.APPROVED):
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

    tc = total_charge_for(d)  # fixed portion + pool portion (if any), one combined charge

    # Reuse an existing pending PaymentIntent if one was already created.
    if d.payment_intent_id:
        try:
            pi = stripe.PaymentIntent.retrieve(d.payment_intent_id)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    else:
        try:
            pi = stripe.PaymentIntent.create(
                amount=tc["total_charge"],
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
        # Defense in depth: the checks above (both approved, source not
        # removed, not already funded) should already guarantee this deal is
        # APPROVED, but confirm against the shared transition table rather
        # than trusting that chain of individual checks never drifts.
        assert_transition(d.status, DealStatus.AWAITING_FUNDING)
        d.payment_intent_id = pi.id
        d.status = DealStatus.AWAITING_FUNDING
        db.add(Payment(
            deal_id=d.id,
            stripe_payment_intent_id=pi.id,
            amount=tc["total_charge"],
            currency=d.currency,
            status=pi.status,
        ))
        db.commit()

    # Checkout line items — shown separately, never folded into one number.
    fixed = deal_money_for(d)
    line_items = [
        {"label": "Listed price", "amount": fixed["listed_price"]},
        {"label": f"Buyer protection fee ({d.buyer_fee_percent}%)", "amount": fixed["buyer_fee"]},
    ]
    if d.pool_max_budget:
        pool_fee = deal_money(d.pool_max_budget, d.seller_fee_percent, d.buyer_fee_percent)["buyer_fee"]
        line_items += [
            {"label": f"Pool budget (up to {d.rate_unit_pence}p per {d.rate_unit_quantity})",
             "amount": d.pool_max_budget},
            {"label": f"Buyer protection fee on pool ({d.buyer_fee_percent}%)", "amount": pool_fee},
        ]

    return {
        "deal_id": d.id,
        "client_secret": pi.client_secret,
        "publishable_key": settings.stripe_publishable_key,
        "currency": d.currency,
        "status": pi.status,
        "line_items": line_items,
        "total_charged": tc["total_charge"],
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
        return deal_dict(d)  # idempotent no-op — already resolved
    assert_transition(d.status, DealStatus.CANCELLED)
    d.status = DealStatus.CANCELLED
    other_id = d.platform_owner_id if user.id == d.business_id else d.business_id
    db.add(Notification(user_id=other_id, type="deal_declined",
                        body=f"Deal #{d.id} was declined.", ref=str(d.id)))
    db.commit()
    db.refresh(d)
    return deal_dict(d)


@router.post("/{deal_id}/payout/instant")
def request_instant_payout(deal_id: int, user: User = Depends(get_current_user),
                           db: Session = Depends(get_db)):
    """The platform owner's one-off 'Get paid now' button on an already-paid
    deal. Owner bears Stripe's instant-payout fee — net_available already
    reflects that. Never touches deal.paid_at/status; this only ever converts
    an already-completed standard payout into an instant one, or leaves it
    alone if that's not possible right now.
    """
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if user.id != d.platform_owner_id:
        raise HTTPException(status_code=403, detail="Only the platform owner can request instant payout")
    if d.paid_at is None:
        raise HTTPException(status_code=409, detail="This deal hasn't been paid out yet")
    if d.instant_payout_id:
        raise HTTPException(status_code=409, detail="This deal was already paid out instantly")

    ca = db.query(ConnectedAccount).filter_by(user_id=user.id).first()
    if ca is None:
        raise HTTPException(status_code=409, detail="No connected payout account")

    result = try_instant_payout(db, d, ca)
    if not result["ok"]:
        reason = result["reason"]
        friendly = {
            "not_eligible": "Your bank or card isn't eligible for instant payouts yet — "
                            "add a debit card in Payout settings, or your bank may already qualify.",
            "no_instant_balance_available": "No instant-eligible balance available for this deal right now.",
        }.get(reason, f"Instant payout couldn't be completed ({reason}).")
        raise HTTPException(status_code=409, detail=friendly)
    db.refresh(d)
    return deal_dict(d)
