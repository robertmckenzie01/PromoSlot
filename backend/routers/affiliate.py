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
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import RequirePerm, get_current_user
from ..models import (AffiliateApplication, AffiliateCode, AffiliateConversion, AffiliateProgram,
                      Notification, User)
from ..permissions import Perm
from ..services import deal_money
from ..stripe_client import stripe
from ..config import settings

router = APIRouter(prefix="/affiliate", tags=["affiliate"])

COMMISSION_TYPES = ("flat", "pct")
HOSTS = ("shopify", "woo", "squarespace", "wix", "custom")
# Hosts we can eventually verify with a real signed server-to-server order
# webhook (Shopify/WooCommerce both support this natively). The rest fall
# back to the weaker client-side tracking snippet — see the conversion
# ingestion piece once it exists.
WEBHOOK_CAPABLE_HOSTS = ("shopify", "woo")

MIN_CAMPAIGN_DAYS, MAX_CAMPAIGN_DAYS = 7, 180
MIN_HOLDING_DAYS, MAX_HOLDING_DAYS = 3, 60
MIN_POOL_BUDGET = 5000       # pence (£50) — a pool smaller than this isn't worth running
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
    return {
        "id": a.id, "program_id": a.program_id,
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
        "removed_reason": c.removed_reason, "removed_at": c.removed_at,
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
