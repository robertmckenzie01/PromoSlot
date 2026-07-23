"""Platform-owner listings: create + browse.

Serializers return objects shaped like the front end's listing objects so the UI
can render real data unchanged. Ratings are derived purely from real reviews of
the owner (a brand-new listing has no rating).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Platform, Review, User

router = APIRouter(prefix="/platforms", tags=["platforms"])


class PlatformCreateIn(BaseModel):
    name: str
    platform_type: str
    handle: Optional[str] = None
    brand: Optional[str] = None
    bio: Optional[str] = None
    niches: List[str] = Field(default_factory=list)
    audience: int = 0
    avg_views: int = 0
    impressions: int = 0
    engagement_rate: float = 0            # percent, e.g. 7.4
    countries: List[str] = Field(default_factory=list)
    ages: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    services: List[str] = Field(default_factory=list)
    pricing: List[dict] = Field(default_factory=list)


def _owner_rating(db: Session, owner_id: int):
    count, avg = (db.query(func.count(Review.id), func.avg(Review.rating))
                  .filter(Review.reviewee_id == owner_id).one())
    return (round(float(avg), 1) if avg is not None else None), (count or 0)


def listing_dict(db: Session, p: Platform) -> dict:
    owner = db.get(User, p.owner_id)
    rating, review_count = _owner_rating(db, p.owner_id)
    meta = p.meta or {}
    return {
        "id": f"p{p.id}",
        "ownerId": str(p.owner_id),
        "owner": owner.display_name if owner else "",
        "brand": p.brand or (owner.display_name if owner else ""),
        "name": p.name,
        "handle": p.handle or "",
        "platform": p.platform_type,
        "niches": p.niches or [],
        "bio": p.bio or "",
        "audience": p.audience or 0,
        "avgViews": p.avg_views or 0,
        "impressions": p.impressions or 0,
        "er": (p.engagement_rate or 0) / 100.0,
        "countries": meta.get("countries", []),
        "ages": meta.get("ages", []),
        "interests": meta.get("interests", []),
        "rating": rating,
        "reviewCount": review_count,
        "verified": p.verified,
        "services": p.services or [],
        "pricing": p.pricing or [],
        "past": [],
    }


@router.post("", status_code=201)
def create_platform(body: PlatformCreateIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not user.is_platform_owner:
        raise HTTPException(status_code=403, detail="Only platform owners can list a platform")
    p = Platform(
        owner_id=user.id,
        brand=body.brand or user.display_name,
        name=body.name,
        platform_type=body.platform_type,
        handle=body.handle,
        bio=body.bio,
        niches=body.niches,
        audience=body.audience,
        avg_views=body.avg_views,
        impressions=body.impressions,
        engagement_rate=round(body.engagement_rate * 100),
        services=body.services,
        pricing=body.pricing,
        meta={"countries": body.countries, "ages": body.ages, "interests": body.interests},
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return listing_dict(db, p)


@router.get("")
def browse_platforms(db: Session = Depends(get_db)):
    rows = db.query(Platform).order_by(Platform.id.desc()).all()
    return [listing_dict(db, p) for p in rows]


@router.get("/mine")
def my_platforms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Platform).filter_by(owner_id=user.id).order_by(Platform.id.desc()).all()
    return [listing_dict(db, p) for p in rows]


@router.get("/{platform_id:int}")
def get_platform(platform_id: int, db: Session = Depends(get_db)):
    p = db.get(Platform, platform_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Platform not found")
    return listing_dict(db, p)
