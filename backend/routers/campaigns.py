"""Business campaigns: create + browse.

Serializers return objects shaped like the front end's campaign objects.
Ratings/applicants come only from real data (a new campaign has none).
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import bulk
from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Campaign, Deal, DealStatus, Notification, Platform, Review, User
from ..services import deal_money_for
from ..storage import delete_stored, save_generic, serve_stored, stored_exists
from .deals import PRICING_MODELS, MAX_CAMPAIGN_DAYS, MIN_CAMPAIGN_DAYS, deal_dict, validate_pricing_fields

_IMG_MAX = 2 * 1024 * 1024 * 1024  # campaign pictures: no meaningful size limit

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class CampaignCreateIn(BaseModel):
    title: str
    industry: Optional[str] = None
    description: Optional[str] = None
    budget: int = 0                        # whole pounds (advertised)
    platforms: List[str] = Field(default_factory=list)
    niches: List[str] = Field(default_factory=list)
    countries: List[str] = Field(default_factory=list)
    services: List[str] = Field(default_factory=list)
    creator_sizes: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)
    payment: List[dict] = Field(default_factory=list)
    deliverables: Optional[str] = None
    duration: Optional[str] = None
    samples: bool = False
    profile: dict = Field(default_factory=dict)


def campaign_dict(db: Session, c: Campaign, ctx=None) -> dict:
    """ctx (see backend.bulk) pre-resolves the business, its rating and the
    applicant counts for a whole page in three queries. Without it this falls
    back to per-row lookups, which is what the single-row callers want."""
    if ctx is not None:
        biz = ctx.user(c.business_id, db)
        avg, count = ctx.rating(c.business_id, db)
    else:
        biz = db.get(User, c.business_id)
        count, avg = (db.query(func.count(Review.id), func.avg(Review.rating))
                      .filter(Review.reviewee_id == c.business_id).one())
        avg = round(float(avg), 1) if avg is not None else None
    # Real applicant count: platform owners who have a live (non-declined)
    # application to this campaign. Zero for a brand-new campaign.
    applicants = bulk.applicants_for(ctx, db, c.id)
    t = c.terms or {}
    return {
        "id": f"c{c.id}",
        "businessId": str(c.business_id),
        "company": biz.display_name if biz else "",
        "industry": c.industry or "",
        "title": c.title,
        "verified": False,
        "rating": avg,
        "reviewCount": count or 0,
        "posted": "just now",
        "applicants": applicants,
        "budget": c.budget or 0,
        "desc": c.description or "",
        "platforms": t.get("platforms", []),
        "niches": t.get("niches", []),
        "countries": t.get("countries", []),
        "services": t.get("services", []),
        "creatorSizes": t.get("creatorSizes", []),
        "goals": t.get("goals", []),
        "payment": t.get("payment", []),
        "deliverables": t.get("deliverables", ""),
        "duration": t.get("duration", ""),
        "samples": t.get("samples", False),
        "profile": t.get("profile", {}),
        # Optional campaign cover image — entirely separate from the business's
        # identity avatar; neither ever defaults to the other.
        "image_url": f"/campaigns/{c.id}/image" if c.image_path else None,
        "has_own_image": bool(c.image_path),
        "suspended": c.suspended_at is not None,
        "removed": c.removed_at is not None,
        "suspended_reason": c.suspended_reason,
        "companyAvatar": f"/users/{c.business_id}/avatar" if (biz and biz.avatar_path) else None,
    }


@router.post("", status_code=201)
def create_campaign(body: CampaignCreateIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not user.is_business:
        raise HTTPException(status_code=403, detail="Only a business can post a campaign")
    c = Campaign(
        business_id=user.id,
        title=body.title,
        industry=body.industry,
        description=body.description,
        budget=body.budget,
        terms={
            "platforms": body.platforms, "niches": body.niches, "countries": body.countries,
            "services": body.services, "creatorSizes": body.creator_sizes, "goals": body.goals,
            "payment": body.payment, "deliverables": body.deliverables,
            "duration": body.duration, "samples": body.samples, "profile": body.profile,
        },
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return campaign_dict(db, c)


@router.get("")
def browse_campaigns(db: Session = Depends(get_db)):
    """Public marketplace — suspended and owner-removed campaigns are withheld."""
    rows = (db.query(Campaign).filter(Campaign.suspended_at.is_(None),
                                      Campaign.removed_at.is_(None))
            .order_by(Campaign.id.desc()).all())
    ctx = bulk.for_campaigns(db, rows)
    return [campaign_dict(db, c, ctx) for c in rows]


@router.get("/mine")
def my_campaigns(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (db.query(Campaign).filter(Campaign.business_id == user.id,
                                      Campaign.removed_at.is_(None))
            .order_by(Campaign.id.desc()).all())
    ctx = bulk.for_campaigns(db, rows)
    return [campaign_dict(db, c, ctx) for c in rows]


@router.get("/{campaign_id:int}")
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign_dict(db, c)


class CampaignUpdateIn(BaseModel):
    """All fields optional — only what's sent is changed."""
    title: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    budget: Optional[int] = None
    platforms: Optional[List[str]] = None
    niches: Optional[List[str]] = None
    countries: Optional[List[str]] = None
    services: Optional[List[str]] = None
    creator_sizes: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    payment: Optional[List[dict]] = None
    deliverables: Optional[str] = None
    duration: Optional[str] = None
    samples: Optional[bool] = None


@router.post("/{campaign_id:int}/update")
def update_campaign(campaign_id: int, body: CampaignUpdateIn,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Edit a published campaign and re-publish it with the new content."""
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.business_id != user.id:
        raise HTTPException(status_code=403, detail="You don't own this campaign")

    for f in ("title", "industry", "description", "budget"):
        v = getattr(body, f)
        if v is not None:
            setattr(c, f, v)
    terms = dict(c.terms or {})
    for src, key in (("platforms", "platforms"), ("niches", "niches"),
                     ("countries", "countries"), ("services", "services"),
                     ("creator_sizes", "creatorSizes"), ("goals", "goals"),
                     ("payment", "payment"), ("deliverables", "deliverables"),
                     ("duration", "duration"), ("samples", "samples")):
        v = getattr(body, src)
        if v is not None:
            terms[key] = v
    c.terms = terms
    db.commit()
    db.refresh(c)
    return campaign_dict(db, c)


@router.post("/{campaign_id:int}/image", status_code=201)
def upload_campaign_image(campaign_id: int, file: UploadFile = File(...),
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.business_id != user.id:
        raise HTTPException(status_code=403, detail="You don't own this campaign")
    try:
        path, _ = save_generic(f"campaign_img/campaign_{c.id}", file, _IMG_MAX)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    delete_stored(c.image_path)
    c.image_path, c.image_content_type = path, file.content_type
    db.commit()
    return {"image_url": f"/campaigns/{c.id}/image"}


@router.get("/{campaign_id:int}/image")
def get_campaign_image(campaign_id: int, db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if c is None or not c.image_path or not stored_exists(c.image_path):
        raise HTTPException(status_code=404, detail="No image")
    return serve_stored(c.image_path, c.image_content_type or "image/jpeg")


# -------------------- Applications (owner-initiated deals) --------------------

class ApplyIn(BaseModel):
    # ge=0 (not 100): a pure per_view/per_impression proposal with no guaranteed
    # floor is valid here the same as it is on a bought listing — see
    # validate_pricing_fields below, which enforces "0, or >=100" once
    # pricing_model is known. A plain fixed proposal still needs >=100 in
    # practice; that's enforced there too since it depends on pricing_model.
    listed_price: int = Field(ge=0, description="Protected amount held pending verification (sum of upfront/guaranteed), in pence")
    platform_id: Optional[int] = None      # which of the owner's listings they'd promote on
    pitch: Optional[str] = None
    currency: str = "gbp"
    # Proposed payment methods (same shape as platform listing pricing). The
    # upfront/guaranteed portion is escrowed as listed_price; performance terms
    # are recorded for both parties. Kept alongside the structured fields below
    # (not replaced by them) so multiple proposed methods can still be shown
    # side-by-side in the deal room even though only one — the structured
    # one, if any — actually drives real settlement. See Deal.pricing_model.
    pricing: Optional[List[dict]] = None

    # Composable pricing — identical shape and meaning to DealCreateIn in
    # routers/deals.py, just originated by the owner here instead of the
    # business. "hybrid" is still not its own value; it's a per_view/
    # per_impression proposal where listed_price is also >0.
    pricing_model: str = "fixed"
    rate_unit_pence: Optional[int] = Field(default=None, ge=1)
    rate_unit_quantity: Optional[int] = Field(default=None, ge=1)
    pool_max_budget: Optional[int] = Field(default=None, ge=100)
    campaign_duration_days: Optional[int] = Field(default=None, ge=MIN_CAMPAIGN_DAYS, le=MAX_CAMPAIGN_DAYS)


@router.post("/{campaign_id:int}/apply", status_code=201)
def apply_to_campaign(campaign_id: int, body: ApplyIn,
                      user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """A platform owner applies to a business's campaign.

    This creates a REAL deal in awaiting_approval — the owner proposes their rate
    and has, by applying, agreed to their own terms (owner_approved=True). The
    business still reviews, approves, and funds it: an application is a proposed
    deal, and the same money flow (approve -> fund -> proof -> verify -> payout)
    applies unchanged. The business remains the payer; the owner remains the payee.
    """
    if not user.is_platform_owner:
        raise HTTPException(status_code=403, detail="Only a platform owner can apply to a campaign")
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.business_id == user.id:
        raise HTTPException(status_code=422, detail="You can't apply to your own campaign")
    if c.suspended_at is not None:
        raise HTTPException(status_code=409, detail="This campaign is suspended and not accepting applications.")
    if c.removed_at is not None:
        raise HTTPException(status_code=409,
                            detail="This campaign has been removed and is no longer accepting applications.")

    # One live application per owner per campaign (a declined one may be re-applied).
    existing = (db.query(Deal)
                .filter(Deal.campaign_id == campaign_id,
                        Deal.platform_owner_id == user.id,
                        Deal.status != DealStatus.CANCELLED)
                .first())
    if existing is not None:
        raise HTTPException(status_code=409, detail="You've already applied to this campaign")

    platform_id = None
    if body.platform_id is not None:
        p = db.get(Platform, body.platform_id)
        if p is None or p.owner_id != user.id:
            raise HTTPException(status_code=422, detail="That platform isn't one of yours")
        platform_id = p.id

    validate_pricing_fields(body.pricing_model, body.listed_price, body.rate_unit_pence,
                            body.rate_unit_quantity, body.pool_max_budget,
                            body.campaign_duration_days)

    # Views promised come from the applicant's own per-view/impression terms.
    promised = None
    for pm in (body.pricing or []):
        f = pm.get("fields") or {}
        for k in ("views", "imps"):
            try:
                v = int(float(f.get(k) or 0))
            except (TypeError, ValueError):
                v = 0
            if v > 0:
                promised = (promised or 0) + v

    d = Deal(
        business_id=c.business_id,
        platform_owner_id=user.id,
        campaign_id=c.id,
        platform_id=platform_id,
        views_promised=promised,
        listed_price=body.listed_price,
        currency=body.currency.lower(),
        seller_fee_percent=settings.seller_fee_percent,
        buyer_fee_percent=settings.buyer_fee_percent,
        status=DealStatus.AWAITING_APPROVAL,
        owner_approved=True,        # applying = agreeing to your own proposed terms
        business_approved=False,
        pricing_model=body.pricing_model,
        rate_unit_pence=body.rate_unit_pence,
        rate_unit_quantity=body.rate_unit_quantity,
        pool_max_budget=body.pool_max_budget,
        campaign_duration_days=body.campaign_duration_days,
        terms={
            "kind": "application",
            "campaign_title": c.title,
            "pitch": body.pitch or "",
            # header/counterparty label in the deal room (matches buy-offer shape)
            "owner": user.display_name,
            "deliverables": (c.terms or {}).get("deliverables", "") or c.title,
            "pricing": body.pricing or [],   # proposed payment methods
        },
    )
    db.add(d)
    db.commit()
    db.refresh(d)

    db.add(Notification(
        user_id=c.business_id, type="campaign_application",
        body=f"{user.display_name} applied to your campaign “{c.title}”.",
        ref=str(d.id),
    ))
    db.commit()
    return deal_dict(d)


@router.get("/{campaign_id:int}/applications")
def campaign_applications(campaign_id: int,
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Applicants to a campaign — visible only to the business that owns it."""
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.business_id != user.id:
        raise HTTPException(status_code=403, detail="Only the campaign owner can view applications")

    rows = (db.query(Deal)
            .filter(Deal.campaign_id == campaign_id, Deal.status != DealStatus.CANCELLED)
            .order_by(Deal.id.desc()).all())
    out = []
    for d in rows:
        owner = db.get(User, d.platform_owner_id)
        m = deal_money_for(d)
        out.append({
            "deal_id": d.id,
            "applicant": owner.display_name if owner else "",
            "applicant_id": d.platform_owner_id,
            "applicant_avatar": (f"/users/{d.platform_owner_id}/avatar"
                                 if (owner and owner.avatar_path) else None),
            "platform_id": d.platform_id,
            "pitch": (d.terms or {}).get("pitch", ""),
            "listed_price": d.listed_price,
            "total_charged": m["charge_amount"],
            "net_to_owner": m["net_to_owner"],
            "status": d.status,
            "business_approved": d.business_approved,
            "owner_approved": d.owner_approved,
            "funded": d.funded_at is not None,
        })
    return out


# -------------------- Owner removal of a campaign --------------------
# Mirrors listing removal (see platforms.py): hard-delete only when nothing real
# is attached, otherwise archive so the deals built on this campaign — and the
# completed-campaign history derived from them — keep resolving.

def _campaign_deal_counts(db: Session, campaign_id: int) -> tuple:
    """(total, still-live) deals referencing this campaign."""
    from ..deal_state import FINAL_STATES
    total = db.query(func.count(Deal.id)).filter(Deal.campaign_id == campaign_id).scalar() or 0
    active = (db.query(func.count(Deal.id))
              .filter(Deal.campaign_id == campaign_id,
                      Deal.status.notin_(list(FINAL_STATES))).scalar() or 0)
    return total, active


def _own_campaign(db: Session, campaign_id: int, user: User) -> Campaign:
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.business_id != user.id:
        raise HTTPException(status_code=403, detail="You don't own this campaign")
    return c


@router.get("/{campaign_id:int}/removal-preview")
def preview_campaign_removal(campaign_id: int, user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """What removing this campaign would do — so the confirmation can be honest."""
    c = _own_campaign(db, campaign_id, user)
    total, active = _campaign_deal_counts(db, c.id)
    return {"title": c.title, "deals_total": total, "deals_active": active,
            "mode": "archive" if total else "delete"}


def remove_campaign_row(db: Session, c: Campaign) -> dict:
    """The actual archive-or-delete logic, shared by the owner-initiated
    DELETE route below and account_deletion.py's cascade. Does not commit;
    caller controls the transaction."""
    total, active = _campaign_deal_counts(db, c.id)

    if total:
        c.removed_at = datetime.utcnow()
        return {"id": f"c{c.id}", "mode": "archived", "deals_total": total,
                "deals_active": active}

    delete_stored(c.image_path)
    db.delete(c)
    return {"id": f"c{c.id}", "mode": "deleted", "deals_total": 0, "deals_active": 0}


@router.delete("/{campaign_id:int}")
def remove_campaign(campaign_id: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    c = _own_campaign(db, campaign_id, user)
    if c.removed_at is not None:
        raise HTTPException(status_code=409, detail="This campaign has already been removed")
    result = remove_campaign_row(db, c)
    db.commit()
    return result
