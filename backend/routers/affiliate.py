"""Affiliate marketplace: pool-funded programs, applications, and the real
discount codes businesses issue to approved platform owners.

Rob, 2026-08-29 (the actual product spec, superseding the earlier
design-only mockup): a platform owner applies to a business's program —
never an instant join. Before approving, the business goes to their OWN
store and creates a real discount code for that specific applicant, then
comes back here and enters it while approving. PromoSlot never invents a
code that might not actually exist at their checkout. Conversions (a later
piece — see conversion tracking ingestion) are only ever created by a
trusted source (a signed webhook from the business's store, or the
fallback tracking snippet) — never self-reported by the platform owner,
which is what actually makes "the platform owner can't lie about sales"
true structurally rather than by policy.

Money model: same shape as Deal. Funding creates a PaymentIntent that
charges the business (pool + funding_fee_percent) into the PLATFORM
balance — the program is only marked funded by the payment_intent.succeeded
webhook (see services.mark_affiliate_program_funded_from_pi), never here,
never optimistically.

Lifecycle: draft -> awaiting_funding -> funded -> live -> ended -> settled.
The campaign clock (campaign_starts_at/ends_at) only starts once the
program goes LIVE (tracking confirmed), not at funding — a business
shouldn't lose campaign days to their own setup time, and platform owners
can't apply before there's anywhere for a sale to be tracked to. Settlement
itself (once at campaign_ends_at + holding_period_days) is a later piece —
see models.AffiliateProgram's docstring in models.py for the full spec.
"""
import csv
import io
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import audit
from ..db import get_db
from ..deps import RequirePerm, get_current_user
from ..models import (AffiliateApplication, AffiliateCode, AffiliateConversion, AffiliateProgram,
                      AffiliateTopUp, ConnectedAccount, Notification, User)
from ..permissions import Perm, is_super_admin
from ..services import (affiliate_settlement_for, deal_money, mark_affiliate_program_funded_from_pi,
                        mark_affiliate_topup_funded_from_pi, onboarding_complete,
                        settle_affiliate_program, sync_connected_account)
from ..stripe_client import client, stripe
from ..config import settings

router = APIRouter(prefix="/affiliate", tags=["affiliate"])

COMMISSION_TYPES = ("flat", "pct")
HOSTS = ("shopify", "woo", "squarespace", "wix", "custom")
# Hosts we can verify with a real server-to-server order webhook rather than
# the weaker client-side tracking snippet. Shopify/WooCommerce sign every
# request (HMAC, verified in routers/affiliate_tracking.py); Wix has no
# native signed-webhook product, but its built-in Automations feature (no
# app/OAuth needed — configurable entirely in the business's own dashboard)
# can send an HTTP request with a custom header on "Order Paid"/"Order
# Refunded", which we authenticate with a shared secret instead of an HMAC.
# Squarespace's only real order-webhook path requires registering PromoSlot
# as an OAuth Developer Platform extension — out of scope for now — so it
# stays on the snippet tier along with "custom".
WEBHOOK_CAPABLE_HOSTS = ("shopify", "woo", "wix")

MIN_CAMPAIGN_DAYS, MAX_CAMPAIGN_DAYS = 7, 180
MIN_HOLDING_DAYS, MAX_HOLDING_DAYS = 3, 60
MIN_POOL_BUDGET = 5000       # pence (£50) — a pool smaller than this isn't worth running
MIN_TOPUP_AMOUNT = 1000      # pence (£10) — same reasoning, smaller isn't worth a whole PaymentIntent
MAX_PCT_RATE = 10000         # commission_rate for "pct" is percent*100, so 10000 = 100.00%


def _require_business(user: User) -> None:
    if not user.is_business:
        raise HTTPException(status_code=403, detail="Only a business account can run an affiliate program")


def _require_platform_owner(user: User) -> None:
    if not user.is_platform_owner:
        raise HTTPException(status_code=403, detail="Only a platform-owner account can apply to affiliate programs")


def _my_program(db: Session, program_id: int, user: User) -> AffiliateProgram:
    p = db.get(AffiliateProgram, program_id)
    if p is None or p.business_id != user.id:
        raise HTTPException(status_code=404, detail="Program not found")
    return p


def _stripe_error(e) -> HTTPException:
    msg = getattr(e, "user_message", None) or str(e)
    return HTTPException(status_code=502, detail=f"Stripe error: {msg}")


def program_dict(db: Session, p: AffiliateProgram) -> dict:
    biz = db.get(User, p.business_id)
    return {
        "id": p.id, "business_id": p.business_id,
        "business_name": biz.display_name if biz else None,
        "name": p.name, "description": p.description, "category": p.category,
        "commission_type": p.commission_type, "commission_rate": p.commission_rate,
        "funding_fee_percent": p.funding_fee_percent, "payout_fee_percent": p.payout_fee_percent,
        "holding_period_days": p.holding_period_days, "currency": p.currency,
        "pool_max_budget": p.pool_max_budget, "pool_committed_amount": p.pool_committed_amount,
        "pool_remaining": max(0, p.pool_max_budget - p.pool_committed_amount),
        "pool_released_amount": p.pool_released_amount, "pool_refunded_amount": p.pool_refunded_amount,
        "campaign_duration_days": p.campaign_duration_days,
        "campaign_starts_at": p.campaign_starts_at, "campaign_ends_at": p.campaign_ends_at,
        "host": p.host, "tracking_confirmed": p.tracking_confirmed_at is not None,
        "status": p.status, "created_at": p.created_at,
    }


def application_dict(db: Session, a: AffiliateApplication) -> dict:
    owner = db.get(User, a.platform_owner_id)
    code = db.query(AffiliateCode).filter_by(application_id=a.id).first()
    program = db.get(AffiliateProgram, a.program_id)
    business = db.get(User, program.business_id) if program else None
    return {
        "id": a.id, "program_id": a.program_id,
        "program_name": program.name if program else None,
        "business_name": business.display_name if business else None,
        "platform_owner_id": a.platform_owner_id,
        "platform_owner_name": owner.display_name if owner else None,
        "platform_owner_email": owner.email if owner else None,
        "message": a.message, "status": a.status,
        "reviewed_by": a.reviewed_by, "reviewed_at": a.reviewed_at,
        "rejected_reason": a.rejected_reason, "created_at": a.created_at,
        "code": code.code if code else None,
    }


def code_dict(db: Session, c: AffiliateCode) -> dict:
    program = db.get(AffiliateProgram, c.program_id)
    return {
        "id": c.id, "program_id": c.program_id, "program_name": program.name if program else None,
        "code": c.code, "active": c.active,
        "removed_reason": c.removed_reason, "removed_message": c.removed_message,
        "removed_at": c.removed_at,
        "payout_net_amount": c.payout_net_amount, "payout_at": c.payout_at,
        "created_at": c.created_at,
    }


def conversion_dict(db: Session, c: AffiliateConversion) -> dict:
    """One tracked sale, shaped for all three audiences (admin/business/
    platform owner) that Rob's spec says must be able to see the same
    record on their own dashboard — never three different views of the
    truth, just three different filtered queries over this one table."""
    code = db.get(AffiliateCode, c.code_id)
    program = db.get(AffiliateProgram, c.program_id)
    owner = db.get(User, code.platform_owner_id) if code else None
    business = db.get(User, program.business_id) if program else None
    return {
        "id": c.id,
        "program_id": c.program_id, "program_name": program.name if program else None,
        "business_id": program.business_id if program else None,
        "business_name": business.display_name if business else None,
        "code_id": c.code_id, "code": code.code if code else None,
        "platform_owner_id": code.platform_owner_id if code else None,
        "platform_owner_name": owner.display_name if owner else None,
        "external_order_ref": c.external_order_ref,
        "sale_amount": c.sale_amount, "commission_amount": c.commission_amount,
        "source": c.source, "status": c.status,
        "reversed_reason": c.reversed_reason, "reversed_at": c.reversed_at,
        "occurred_at": c.occurred_at, "reported_at": c.reported_at,
    }


# ---------------------------------------------------------------------------
# Business: create + fund + go live
# ---------------------------------------------------------------------------

class ProgramIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = None
    category: Optional[str] = None
    commission_type: str
    commission_rate: int = Field(gt=0)
    holding_period_days: int = 14
    campaign_duration_days: int
    pool_max_budget: int


@router.post("/programs", status_code=201)
def create_program(body: ProgramIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Draft only — no money moves until POST /programs/{id}/fund."""
    _require_business(user)
    if body.commission_type not in COMMISSION_TYPES:
        raise HTTPException(status_code=422, detail=f"commission_type must be one of {COMMISSION_TYPES}")
    if body.commission_type == "pct" and body.commission_rate > MAX_PCT_RATE:
        raise HTTPException(status_code=422, detail="commission_rate (pct) can't exceed 10000 (100.00%)")
    if not (MIN_HOLDING_DAYS <= body.holding_period_days <= MAX_HOLDING_DAYS):
        raise HTTPException(status_code=422,
                            detail=f"holding_period_days must be between {MIN_HOLDING_DAYS} and {MAX_HOLDING_DAYS}")
    if not (MIN_CAMPAIGN_DAYS <= body.campaign_duration_days <= MAX_CAMPAIGN_DAYS):
        raise HTTPException(status_code=422,
                            detail=f"campaign_duration_days must be between {MIN_CAMPAIGN_DAYS} and {MAX_CAMPAIGN_DAYS}")
    if body.pool_max_budget < MIN_POOL_BUDGET:
        raise HTTPException(status_code=422, detail=f"pool_max_budget must be at least {MIN_POOL_BUDGET} pence")

    p = AffiliateProgram(
        business_id=user.id, name=body.name.strip(), description=body.description,
        category=body.category, commission_type=body.commission_type, commission_rate=body.commission_rate,
        holding_period_days=body.holding_period_days, campaign_duration_days=body.campaign_duration_days,
        pool_max_budget=body.pool_max_budget, status="draft",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return program_dict(db, p)


@router.get("/programs/mine")
def my_programs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_business(user)
    rows = (db.query(AffiliateProgram).filter_by(business_id=user.id)
           .order_by(AffiliateProgram.created_at.desc()).all())
    return [program_dict(db, p) for p in rows]


@router.post("/programs/{program_id}/fund")
def fund_program(program_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create (or reuse) the PaymentIntent for this program's pool. Business
    only. Returns client_secret for Stripe.js — funded only once the
    payment_intent.succeeded webhook confirms it, same as deal funding."""
    p = _my_program(db, program_id, user)
    if p.status != "draft" and not (p.status == "awaiting_funding" and p.payment_intent_id):
        raise HTTPException(status_code=409, detail="Program isn't awaiting funding")

    # Same math as every other pool on PromoSlot: charge_amount = pool +
    # funding_fee_percent on top. deal_money()'s "buyer_pct" param is
    # reused here as the funding fee — same formula, different name.
    money = deal_money(p.pool_max_budget, p.payout_fee_percent, p.funding_fee_percent)

    if p.payment_intent_id:
        try:
            pi = stripe.PaymentIntent.retrieve(p.payment_intent_id)
        except Exception as e:
            raise _stripe_error(e)
    else:
        try:
            pi = stripe.PaymentIntent.create(
                amount=money["charge_amount"],
                currency=p.currency,
                payment_method_types=["card"],
                # No transfer_data/on_behalf_of — funds sit in the PLATFORM
                # balance (the pool escrow), same as every deal's funding.
                metadata={"affiliate_program_id": str(p.id), "promoslot": "affiliate_program_funding"},
                description=f"PromoSlot affiliate program #{p.id} — {p.name}",
            )
        except Exception as e:
            raise _stripe_error(e)
        p.payment_intent_id = pi.id
        p.status = "awaiting_funding"
        # No Payment row here — that table's deal_id is NOT NULL (deal-only
        # bookkeeping). The PaymentIntent id is already tracked directly on
        # AffiliateProgram.payment_intent_id, which is all the funding
        # webhook (mark_affiliate_program_funded_from_pi) needs to find it.
        db.commit()

    return {
        "program_id": p.id,
        "client_secret": pi.client_secret,
        "publishable_key": settings.stripe_publishable_key,
        "currency": p.currency,
        "status": pi.status,
        "line_items": [
            {"label": "Affiliate pool budget", "amount": p.pool_max_budget},
            {"label": f"PromoSlot fee ({p.funding_fee_percent}%)", "amount": money["buyer_fee"]},
        ],
        "total_charged": money["charge_amount"],
    }


@router.post("/programs/{program_id}/refresh")
def refresh_program_funding(program_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Reconcile funding with Stripe right after a client-side confirmation —
    same shape as POST /deals/{id}/refresh. In production the
    payment_intent.succeeded webhook marks the program funded; this is the
    same real re-verification (retrieve the PaymentIntent; fund only if
    status == 'succeeded') triggered from the client, also a robust
    fallback if a webhook is delayed. Never simulates funding."""
    p = _my_program(db, program_id, user)
    if p.payment_intent_id and p.status == "awaiting_funding":
        mark_affiliate_program_funded_from_pi(db, p.payment_intent_id)
        db.refresh(p)
    return program_dict(db, p)


def topup_dict(t: AffiliateTopUp) -> dict:
    return {
        "id": t.id, "program_id": t.program_id, "amount": t.amount,
        "funding_fee_percent": t.funding_fee_percent, "status": t.status,
        "created_at": t.created_at, "funded_at": t.funded_at,
    }


class TopUpIn(BaseModel):
    amount: int = Field(gt=0)   # pence, principal to add (excludes funding fee)


@router.post("/programs/{program_id}/topup", status_code=201)
def topup_program(program_id: int, body: TopUpIn,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add more budget to an already-live pool. Its own PaymentIntent, its
    own AffiliateTopUp row — pool_max_budget only increases once Stripe
    confirms this succeeded (services.mark_affiliate_topup_funded_from_pi),
    never optimistically here. Only while the program is actually live and
    running — topping up a draft (fund it properly instead) or a program
    whose campaign has already ended doesn't make sense."""
    p = _my_program(db, program_id, user)
    if p.status != "live":
        raise HTTPException(status_code=409, detail="Only a live program can be topped up")
    if body.amount < MIN_TOPUP_AMOUNT:
        raise HTTPException(status_code=422, detail=f"Top-up amount must be at least {MIN_TOPUP_AMOUNT} pence")

    money = deal_money(body.amount, p.payout_fee_percent, p.funding_fee_percent)
    try:
        pi = stripe.PaymentIntent.create(
            amount=money["charge_amount"],
            currency=p.currency,
            payment_method_types=["card"],
            metadata={"affiliate_program_id": str(p.id), "promoslot": "affiliate_program_topup"},
            description=f"PromoSlot affiliate program #{p.id} — {p.name} (pool top-up)",
        )
    except Exception as e:
        raise _stripe_error(e)

    t = AffiliateTopUp(program_id=p.id, amount=body.amount, funding_fee_percent=p.funding_fee_percent,
                       payment_intent_id=pi.id, status="pending")
    db.add(t)
    db.commit()
    db.refresh(t)

    return {
        "topup_id": t.id, "program_id": p.id,
        "client_secret": pi.client_secret,
        "publishable_key": settings.stripe_publishable_key,
        "currency": p.currency, "status": pi.status,
        "line_items": [
            {"label": "Pool top-up", "amount": body.amount},
            {"label": f"PromoSlot fee ({p.funding_fee_percent}%)", "amount": money["buyer_fee"]},
        ],
        "total_charged": money["charge_amount"],
    }


@router.get("/programs/{program_id}/topups")
def program_topups(program_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = _my_program(db, program_id, user)
    rows = (db.query(AffiliateTopUp).filter_by(program_id=p.id)
           .order_by(AffiliateTopUp.created_at.desc()).all())
    return [topup_dict(t) for t in rows]


@router.post("/topups/{topup_id}/refresh")
def refresh_topup_funding(topup_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Same reconciliation shape as /programs/{id}/refresh, for a top-up."""
    t = db.get(AffiliateTopUp, topup_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Top-up not found")
    _my_program(db, t.program_id, user)  # cross-tenant guard
    if t.payment_intent_id and t.status == "pending":
        mark_affiliate_topup_funded_from_pi(db, t.payment_intent_id)
        db.refresh(t)
    return topup_dict(t)


class TrackingIn(BaseModel):
    host: str


@router.post("/programs/{program_id}/confirm-tracking")
def confirm_tracking(program_id: int, body: TrackingIn,
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The campaign clock starts HERE, not at funding — see module docstring.
    Generates a webhook_secret for shopify/woo now so the conversion-ingestion
    endpoint (a later piece) has something to verify against from day one."""
    p = _my_program(db, program_id, user)
    if body.host not in HOSTS:
        raise HTTPException(status_code=422, detail=f"host must be one of {HOSTS}")
    if p.status != "funded":
        raise HTTPException(status_code=409, detail="Program must be funded before tracking can be confirmed")

    p.host = body.host
    p.tracking_confirmed_at = datetime.utcnow()
    if body.host in WEBHOOK_CAPABLE_HOSTS and not p.webhook_secret:
        p.webhook_secret = secrets.token_hex(24)
    p.status = "live"
    p.campaign_starts_at = p.tracking_confirmed_at
    p.campaign_ends_at = p.tracking_confirmed_at + timedelta(days=p.campaign_duration_days)
    db.commit()
    db.refresh(p)
    return program_dict(db, p)


@router.get("/programs/{program_id}/tracking-setup")
def tracking_setup(program_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything a business needs to actually wire up their store, in one
    place — callable any time after confirm-tracking, not just once, since
    a business (or whoever they hand this to) will realistically need to
    come back to it. Nothing here is invented at request time: the webhook
    URL/secret are the exact values routers/affiliate_tracking.py checks
    requests against, and the snippet POSTs to the exact endpoint it accepts."""
    p = _my_program(db, program_id, user)
    if not p.host:
        raise HTTPException(status_code=409, detail="Pick where your checkout lives first")
    base = settings.app_base_url.rstrip("/")

    if p.host in WEBHOOK_CAPABLE_HOSTS:
        webhook_url = f"{base}/affiliate/webhooks/{p.host}/{p.id}"
        if p.host == "shopify":
            steps = [
                "In your Shopify admin: Settings → Notifications → scroll down to Webhooks → Create webhook.",
                "Event: \"Order creation\". Format: JSON.",
                f"URL: {webhook_url}",
                "Save — Shopify signs every request automatically, so there's no secret to copy in for this one.",
                "Repeat for \"Order cancellation\" and \"Refund create\" so refunds correctly reverse a tracked sale.",
            ]
        elif p.host == "woo":
            steps = [
                "In your WooCommerce admin: Settings → Advanced → Webhooks → Add webhook.",
                "Topic: \"Order updated\" (covers processing, completed, refunded and cancelled).",
                f"Delivery URL: {webhook_url}",
                f"Secret: {p.webhook_secret}",
                "Save — WooCommerce signs every request with that secret.",
            ]
        else:  # wix
            steps = [
                "In your Wix dashboard: Automations → Create New Automation.",
                "Trigger: \"Order Paid\". Action: \"Send HTTP Request\".",
                f"URL: {webhook_url}   ·   Method: POST",
                f"Add a custom header — X-PromoSlot-Secret: {p.webhook_secret}",
                "Body (JSON), using Wix's own dynamic-field picker for the values in {}: "
                '{"event":"sale","code":"{Coupon Code}","amount":"{Order Total}","order_ref":"{Order Number}"}',
                "Create a second automation the same way for refunds — Trigger: \"Order Refunded\" (or \"Order Cancelled\"), same URL and header, but with \"event\":\"reversal\" in the body instead of \"sale\".",
            ]
        return {"host": p.host, "tier": "webhook", "webhook_url": webhook_url,
                "webhook_secret": p.webhook_secret, "steps": steps, "snippet": None}

    snippet = (
        "<script>\n"
        "(function(){\n"
        "  var o = window.PromoSlotOrder; // set this before this script runs\n"
        "  if (!o || !o.code) return;\n"
        f"  fetch(\"{base}/affiliate/track/snippet/{p.id}\", {{\n"
        "    method: \"POST\",\n"
        "    headers: {\"Content-Type\": \"application/json\"},\n"
        "    body: JSON.stringify({code:o.code, amount:o.amount, order_ref:o.order_ref||null})\n"
        "  });\n"
        "})();\n"
        "</script>"
    )
    steps = [
        "This platform doesn't offer a signed server-to-server webhook, so tracking relies on a lighter snippet instead — weaker than the Shopify/WooCommerce/Wix path, but it's what makes tracking possible here at all.",
        "Add the snippet below to your order confirmation / thank-you page — the page a buyer lands on right after they check out.",
        "Before the snippet runs, set window.PromoSlotOrder with that specific order's real values: the discount code that was used, the order total in pence (e.g. 1999 for £19.99), and optionally your own order reference.",
        "If you're not comfortable editing this yourself, hand this snippet and the three values it needs to whoever built your site — your checkout already has this order data somewhere, it just needs to reach this script.",
    ]
    if p.host == "squarespace":
        steps.insert(1, "On Squarespace (Commerce plans): Settings → Advanced → Code Injection → Order Confirmation Page, and paste the snippet there.")
    return {"host": p.host, "tier": "snippet", "webhook_url": None, "webhook_secret": None,
            "steps": steps, "snippet": snippet}


# ---------------------------------------------------------------------------
# Platform owner: browse + apply
# ---------------------------------------------------------------------------

@router.get("/programs")
def browse_programs(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Public — no auth required to browse, same as the main marketplace."""
    q = db.query(AffiliateProgram).filter(AffiliateProgram.status == "live")
    if category:
        q = q.filter(AffiliateProgram.category == category)
    rows = q.order_by(AffiliateProgram.created_at.desc()).all()
    return [program_dict(db, p) for p in rows
            if (p.pool_max_budget - p.pool_committed_amount) > 0
            and (p.campaign_ends_at is None or p.campaign_ends_at > datetime.utcnow())]


@router.get("/programs/{program_id}")
def program_detail(program_id: int, db: Session = Depends(get_db)):
    p = db.get(AffiliateProgram, program_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Program not found")
    return program_dict(db, p)


class ApplyIn(BaseModel):
    message: Optional[str] = None


@router.post("/programs/{program_id}/apply", status_code=201)
def apply_to_program(program_id: int, body: ApplyIn,
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_platform_owner(user)
    p = db.get(AffiliateProgram, program_id)
    if p is None or p.status != "live":
        raise HTTPException(status_code=404, detail="Program not found or not accepting applications")
    existing = db.query(AffiliateApplication).filter_by(
        program_id=program_id, platform_owner_id=user.id).order_by(AffiliateApplication.created_at.desc()).first()
    if existing and existing.status in ("pending", "approved"):
        return application_dict(db, existing)

    a = AffiliateApplication(program_id=program_id, platform_owner_id=user.id, message=body.message)
    db.add(a)
    db.commit()
    db.refresh(a)
    db.add(Notification(user_id=p.business_id, type="affiliate_application",
                        body=f"{user.display_name or user.email} applied to join {p.name}.",
                        ref=f"affiliate_review:{p.id}"))
    db.commit()
    return application_dict(db, a)


@router.get("/applications/mine")
def my_applications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_platform_owner(user)
    rows = (db.query(AffiliateApplication).filter_by(platform_owner_id=user.id)
           .order_by(AffiliateApplication.created_at.desc()).all())
    return [application_dict(db, a) for a in rows]


@router.get("/codes/mine")
def my_codes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_platform_owner(user)
    rows = (db.query(AffiliateCode).filter_by(platform_owner_id=user.id, active=True)
           .order_by(AffiliateCode.created_at.desc()).all())
    return [code_dict(db, c) for c in rows]


@router.get("/conversions/mine")
def my_conversions(status: Optional[str] = None,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Platform owner's own view of every tracked sale across all their
    codes/programs — the same rows the business and admin see. Never built
    from anything the owner submitted themselves (see
    services.record_affiliate_conversion's docstring)."""
    _require_platform_owner(user)
    q = (db.query(AffiliateConversion)
        .join(AffiliateCode, AffiliateConversion.code_id == AffiliateCode.id)
        .filter(AffiliateCode.platform_owner_id == user.id))
    if status:
        q = q.filter(AffiliateConversion.status == status)
    rows = q.order_by(AffiliateConversion.reported_at.desc()).all()
    return [conversion_dict(db, c) for c in rows]


# ---------------------------------------------------------------------------
# Business: review applications
# ---------------------------------------------------------------------------

@router.get("/programs/{program_id}/applications")
def program_applications(program_id: int, status: Optional[str] = None,
                         user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = _my_program(db, program_id, user)
    q = db.query(AffiliateApplication).filter_by(program_id=p.id)
    if status:
        q = q.filter(AffiliateApplication.status == status)
    rows = q.order_by(AffiliateApplication.created_at.desc()).all()
    return [application_dict(db, a) for a in rows]


@router.get("/programs/{program_id}/codes")
def program_codes(program_id: int, active: Optional[bool] = None,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Business's own view of the real AffiliateCode rows on their program —
    with the real code_id remove_partner needs, unlike application_dict's
    code (just the string). Includes inactive/removed ones by default so a
    business can see their own removal history, not just current partners."""
    p = _my_program(db, program_id, user)
    q = db.query(AffiliateCode).filter_by(program_id=p.id)
    if active is not None:
        q = q.filter(AffiliateCode.active == active)
    rows = q.order_by(AffiliateCode.created_at.desc()).all()
    out = []
    for c in rows:
        d = code_dict(db, c)
        owner = db.get(User, c.platform_owner_id)
        d["platform_owner_id"] = c.platform_owner_id
        d["platform_owner_name"] = owner.display_name if owner else None
        out.append(d)
    return out


@router.get("/programs/{program_id}/conversions")
def program_conversions(program_id: int, status: Optional[str] = None,
                        user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Business's own view of tracked sales on their program — the same
    records the platform owner and admin see, never a business-only summary
    the owner can't cross-check (see /conversions/mine below)."""
    p = _my_program(db, program_id, user)
    q = db.query(AffiliateConversion).filter_by(program_id=p.id)
    if status:
        q = q.filter(AffiliateConversion.status == status)
    rows = q.order_by(AffiliateConversion.reported_at.desc()).all()
    return [conversion_dict(db, c) for c in rows]


@router.get("/programs/{program_id}/conversions/export")
def export_program_conversions(program_id: int, status: Optional[str] = None,
                               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """CSV of the same rows /programs/{id}/conversions returns — for a
    business's own bookkeeping/reconciliation, not a different view of the
    data."""
    p = _my_program(db, program_id, user)
    q = db.query(AffiliateConversion).filter_by(program_id=p.id)
    if status:
        q = q.filter(AffiliateConversion.status == status)
    rows = q.order_by(AffiliateConversion.reported_at.desc()).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["conversion_id", "reported_at", "occurred_at", "code", "platform_owner",
                     "external_order_ref", "sale_amount_pence", "commission_amount_pence",
                     "source", "status", "reversed_reason"])
    for c in rows:
        d = conversion_dict(db, c)
        writer.writerow([d["id"], d["reported_at"], d["occurred_at"], d["code"],
                         d["platform_owner_name"], d["external_order_ref"] or "",
                         d["sale_amount"], d["commission_amount"], d["source"], d["status"],
                         d["reversed_reason"] or ""])
    buf.seek(0)
    filename = f"promoslot-affiliate-{p.id}-conversions.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


def _my_application(db: Session, application_id: int, user: User) -> AffiliateApplication:
    a = db.get(AffiliateApplication, application_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Application not found")
    p = db.get(AffiliateProgram, a.program_id)
    if p is None or p.business_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found")
    return a


class ApproveIn(BaseModel):
    # Rob, 2026-08-29 (verbatim): "before a business will accept the
    # application, they will add on their website a custom discount code
    # for the platform owner applying, which will then be given to them
    # after the business goes back to promoslot and accepts". This is that
    # real code, exactly as it exists on the business's own store —
    # PromoSlot never generates one itself.
    code: str = Field(min_length=1, max_length=64)
    message: Optional[str] = None


@router.post("/applications/{application_id}/approve")
def approve_application(application_id: int, body: ApproveIn,
                        user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _my_application(db, application_id, user)
    if a.status != "pending":
        raise HTTPException(status_code=409, detail="Already decided")

    a.status = "approved"
    a.reviewed_by = user.id
    a.reviewed_at = datetime.utcnow()
    code = AffiliateCode(program_id=a.program_id, platform_owner_id=a.platform_owner_id,
                         application_id=a.id, code=body.code.strip())
    db.add(code)
    db.commit()
    db.refresh(a)

    db.add(Notification(user_id=a.platform_owner_id, type="affiliate_approved",
                        body=(f"You're in! Your code is {code.code}."
                              + (f" {body.message.strip()}" if body.message else "")),
                        ref=f"affiliate_codes"))
    db.commit()
    return application_dict(db, a)


class RejectIn(BaseModel):
    reason: str = Field(min_length=1)


@router.post("/applications/{application_id}/reject")
def reject_application(application_id: int, body: RejectIn,
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _my_application(db, application_id, user)
    if a.status != "pending":
        raise HTTPException(status_code=409, detail="Already decided")

    a.status = "rejected"
    a.reviewed_by = user.id
    a.reviewed_at = datetime.utcnow()
    a.rejected_reason = body.reason.strip()
    db.commit()
    db.refresh(a)

    p = db.get(AffiliateProgram, a.program_id)
    db.add(Notification(user_id=a.platform_owner_id, type="affiliate_rejected",
                        body=f"Your application to {p.name if p else 'an affiliate program'} wasn't approved: {a.rejected_reason}",
                        ref=f"affiliate_browse"))
    db.commit()
    return application_dict(db, a)


# ---------------------------------------------------------------------------
# Business: remove a partner (revoke an approved code)
# ---------------------------------------------------------------------------

def _my_code(db: Session, code_id: int, user: User) -> AffiliateCode:
    c = db.get(AffiliateCode, code_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Code not found")
    p = db.get(AffiliateProgram, c.program_id)
    if p is None or p.business_id != user.id:
        raise HTTPException(status_code=404, detail="Code not found")
    return c


class RemovePartnerIn(BaseModel):
    reason: str = Field(min_length=1)
    message: Optional[str] = None


@router.post("/codes/{code_id}/remove")
def remove_partner(code_id: int, body: RemovePartnerIn, request: Request,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Deactivate a platform owner's code immediately — no more sales will
    ever be tracked against it (services.record_affiliate_conversion checks
    active) — while keeping the row itself as the permanent record (never
    deleted). A reason is required, an optional message is passed to the
    owner alongside it. Every already-tracked, still-pending conversion on
    this code is untouched here and still counts toward that owner's payout
    at settlement — removing a partner ends the relationship going forward,
    it doesn't erase commission already earned. This action is logged for
    PromoSlot's records (see the audit.record call below)."""
    c = _my_code(db, code_id, user)
    if not c.active:
        raise HTTPException(status_code=409, detail="This partner has already been removed")

    before = {"active": c.active}
    c.active = False
    c.removed_reason = body.reason.strip()
    c.removed_message = (body.message or "").strip() or None
    c.removed_by = user.id
    c.removed_at = datetime.utcnow()
    db.commit()
    db.refresh(c)

    p = db.get(AffiliateProgram, c.program_id)
    db.add(Notification(
        user_id=c.platform_owner_id, type="affiliate_partner_removed",
        body=(f"You've been removed from {p.name if p else 'an affiliate program'}. "
              f"Reason: {c.removed_reason}." + (f" {c.removed_message}" if c.removed_message else "")),
        ref="affiliate_codes",
    ))
    db.commit()

    audit.record(db, actor=user, action="affiliate.remove_partner", target_type="affiliate_code",
                target_id=c.id, previous_state=before, new_state={"active": c.active},
                reason=body.reason, request=request)

    return code_dict(db, c)


# ---------------------------------------------------------------------------
# Admin: read-only oversight, same records the business/owner see
# ---------------------------------------------------------------------------
# Rob, 2026-08-29 (verbatim): "Once they are reported the admin(s), business,
# and [platform owner] can all see these records on their own separate
# dashboards." Deliberately no admin DECIDE endpoints here — there's no
# human call to make on a conversion the way there is on a verification or a
# dispute; these are just three filtered views over the same rows.

@router.get("/admin/programs")
def admin_programs(status: Optional[str] = None,
                   user: User = Depends(RequirePerm(Perm.AFFILIATE_VIEW)), db: Session = Depends(get_db)):
    q = db.query(AffiliateProgram)
    if status:
        q = q.filter(AffiliateProgram.status == status)
    rows = q.order_by(AffiliateProgram.created_at.desc()).all()
    return [program_dict(db, p) for p in rows]


@router.get("/admin/conversions")
def admin_conversions(program_id: Optional[int] = None, status: Optional[str] = None,
                      user: User = Depends(RequirePerm(Perm.AFFILIATE_VIEW)), db: Session = Depends(get_db)):
    q = db.query(AffiliateConversion)
    if program_id:
        q = q.filter(AffiliateConversion.program_id == program_id)
    if status:
        q = q.filter(AffiliateConversion.status == status)
    rows = q.order_by(AffiliateConversion.reported_at.desc()).limit(500).all()
    return [conversion_dict(db, c) for c in rows]


# ---------------------------------------------------------------------------
# Admin: campaign-end settlement + payout
# ---------------------------------------------------------------------------
# Rob, 2026-08-29 (verbatim): "By the end of the affiliate campaign, the
# money will be released to the platform owner on how many sales they have
# made with promoslot taking a cut in specifically that from both ends ...
# whatever the business owner receives back (if budget is not fully used)
# should not be 'fee'd'." One settlement event per program — see
# services.settle_affiliate_program for the real Stripe execution and
# services.affiliate_settlement_for for the pure fee/split math (same
# deal_money()-twice shape as Deal's pool_settlement_for).
#
# Manual, admin-triggered — same pattern as /review/deals/{id}/settle-pool,
# not a background cron job. There's no live campaign to time a scheduler
# against yet; wiring this to a cron endpoint later (same shape as
# routers/marketing.py's cron_send_campaign) is a trivial follow-up once
# there is one.

_INCLUDE = ["configuration.recipient", "requirements", "identity"]


def _ready_connected_account_for_owner(db: Session, owner_id: int) -> ConnectedAccount:
    """Live-checks one platform owner's payout account. Deliberately NOT
    shared with routers/review.py's near-identical _ready_connected_account
    (same v2 retrieve + sync_connected_account + onboarding_complete shape,
    keyed by owner id here instead of by deal) — mirrors it rather than
    refactoring it, so this new settlement path can't accidentally change
    behavior on the already-live, already-tested deal payout path.
    """
    ca = db.query(ConnectedAccount).filter_by(user_id=owner_id).first()
    if ca is None:
        raise HTTPException(status_code=409,
                            detail=f"Platform owner {owner_id} has not connected a payout account")
    try:
        acct = client.v2.core.accounts.retrieve(ca.stripe_account_id, {"include": _INCLUDE})
        ca = sync_connected_account(db, acct) or ca
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error checking payout account: {e}")
    if not onboarding_complete(ca):
        raise HTTPException(status_code=409,
                            detail=f"Platform owner {owner_id}'s payouts are not enabled yet (onboarding incomplete)")
    return ca


def _pending_commission_totals(db: Session, program_id: int) -> dict:
    rows = (db.query(AffiliateConversion)
           .join(AffiliateCode, AffiliateConversion.code_id == AffiliateCode.id)
           .filter(AffiliateConversion.program_id == program_id,
                   AffiliateConversion.status == "pending").all())
    totals: dict = {}
    for c in rows:
        code = db.get(AffiliateCode, c.code_id)
        if code is None:
            continue
        totals[code.platform_owner_id] = totals.get(code.platform_owner_id, 0) + c.commission_amount
    return totals


@router.get("/admin/programs/{program_id}/settlement-preview")
def settlement_preview(program_id: int,
                       user: User = Depends(RequirePerm(Perm.AFFILIATE_VIEW)), db: Session = Depends(get_db)):
    """Read-only: exactly what /settle would pay out right now, without
    moving any real money. Lets an admin sanity-check the numbers (and see
    which owners aren't payout-ready yet) before triggering the real thing."""
    p = db.get(AffiliateProgram, program_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Program not found")
    totals = _pending_commission_totals(db, p.id)
    math_result = affiliate_settlement_for(p, totals)
    not_ready = []
    for owner_id in math_result["payouts"]:
        try:
            _ready_connected_account_for_owner(db, owner_id)
        except HTTPException as e:
            not_ready.append({"platform_owner_id": owner_id, "detail": e.detail})
    return {**math_result, "not_ready": not_ready}


class SettleIn(BaseModel):
    reason: Optional[str] = None


@router.post("/admin/programs/{program_id}/settle")
def settle_program(program_id: int, body: SettleIn, request: Request,
                   user: User = Depends(RequirePerm(Perm.PAYOUT_RELEASE)), db: Session = Depends(get_db)):
    """The one settlement event for this program's whole campaign. Blocks
    entirely (no partial settlement) if any owner with a nonzero payout
    isn't payout-ready yet — better to make the business/admin wait than to
    settle the program, mark it closed, and strand an owner's earned
    commission with no path to actually pay them.
    """
    p = db.get(AffiliateProgram, program_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Program not found")
    if p.status not in ("live", "ended"):
        raise HTTPException(status_code=409, detail=f"Program is '{p.status}', not settleable")
    if p.campaign_ends_at is None:
        raise HTTPException(status_code=409, detail="Program has no campaign end date yet")
    settleable_at = p.campaign_ends_at + timedelta(days=p.holding_period_days)
    if datetime.utcnow() < settleable_at:
        raise HTTPException(status_code=409,
                            detail=f"Holding period hasn't ended yet — settleable from {settleable_at.isoformat()}")

    totals = _pending_commission_totals(db, p.id)
    math_result = affiliate_settlement_for(p, totals)

    destinations = {}
    for owner_id, payout in math_result["payouts"].items():
        if payout["net_to_owner"] <= 0:
            continue
        ca = _ready_connected_account_for_owner(db, owner_id)  # raises 409/502, blocking settlement entirely
        destinations[owner_id] = ca.stripe_account_id

    total_payout = sum(pv["net_to_owner"] for pv in math_result["payouts"].values())
    if total_payout > settings.payout_admin_limit_pence and not is_super_admin(user):
        raise HTTPException(status_code=403,
                            detail=(f"Settlement payout total above £{settings.payout_admin_limit_pence/100:,.2f} "
                                    "requires Super-Admin approval."))

    before = {"status": p.status, "pool_committed_amount": p.pool_committed_amount}
    try:
        result = settle_affiliate_program(db, p, destinations)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe settlement failed: {e}")

    audit.record(db, actor=user, action="affiliate.settle", target_type="affiliate_program",
                target_id=p.id, previous_state=before,
                new_state={"status": p.status, "pool_released_amount": p.pool_released_amount,
                          "pool_refunded_amount": p.pool_refunded_amount},
                reason=body.reason, request=request)

    return {
        "program_id": p.id, "status": p.status,
        "total_commission": result["math"]["total_commission"],
        "total_commission_capped": result["math"]["total_commission_capped"],
        "platform_take": result["math"]["platform_take"],
        "refund_to_business": result["math"]["refund_to_business"],
        "transfers": result["transfers"],
        "refund_id": result["refund"].id if result["refund"] else None,
        "errors": result["errors"],
    }
