"""Reviews.

A review can only be created for a genuinely completed (paid) deal, by one of
its two real parties, and only once per author per deal. Reviews are never
auto-generated. A user's public rating is derived purely from these real
reviews, so a profile with no completed deals simply has no rating.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Deal, Review, User

router = APIRouter(tags=["reviews"])


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: Optional[str] = Field(default=None, max_length=2000)


def review_dict(r: Review, db: Session = None) -> dict:
    d = {
        "id": r.id,
        "deal_id": r.deal_id,
        "author_id": r.author_id,
        "reviewee_id": r.reviewee_id,
        "rating": r.rating,
        "text": r.text,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }
    if db is not None:
        a = db.get(User, r.author_id)
        d["author_name"] = (a.display_name or a.email) if a else ""
        d["author_avatar"] = f"/users/{a.id}/avatar" if (a and a.avatar_path) else None
    return d


@router.post("/deals/{deal_id}/review", status_code=201)
def create_review(deal_id: int, body: ReviewIn,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    if user.id not in (d.business_id, d.platform_owner_id):
        raise HTTPException(status_code=403, detail="Not a party to this deal")
    # The core rule: a review only exists for a genuinely completed deal.
    if d.paid_at is None:
        raise HTTPException(status_code=409, detail="You can only review a completed (paid) deal")
    # One review per author per deal.
    if db.query(Review).filter_by(deal_id=d.id, author_id=user.id).first():
        raise HTTPException(status_code=409, detail="You have already reviewed this deal")

    reviewee_id = d.platform_owner_id if user.id == d.business_id else d.business_id
    r = Review(deal_id=d.id, author_id=user.id, reviewee_id=reviewee_id,
               rating=body.rating, text=body.text)
    db.add(r)
    db.commit()
    db.refresh(r)
    return review_dict(r)


@router.get("/deals/{deal_id}/reviews")
def deal_reviews(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Review).filter_by(deal_id=deal_id).order_by(Review.id.desc()).all()
    return [review_dict(r, db) for r in rows]


@router.get("/users/{user_id}/reviews")
def user_reviews(user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Public rating for a user, derived only from real completed-deal reviews."""
    rows = (db.query(Review).filter_by(reviewee_id=user_id)
            .order_by(Review.id.desc()).all())
    agg = (db.query(func.count(Review.id), func.avg(Review.rating))
           .filter(Review.reviewee_id == user_id).one())
    count, avg = agg[0], agg[1]
    return {
        "user_id": user_id,
        "count": count,
        "average": round(float(avg), 2) if avg is not None else None,
        "reviews": [review_dict(r, db) for r in rows],
    }


@router.get("/users/{user_id}/public")
def public_profile(user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """A party's real public profile: identity, rating, reviews, and their
    listings (if a platform owner) / campaigns (if a business). Used to make
    each party's name in a deal clickable through to who they actually are.
    """
    from ..models import Campaign, Platform, PlatformMedia, ProfileAsset
    from .platforms import (completed_campaigns_by_business, completed_campaigns_for,
                            listing_dict, media_dict)
    from .campaigns import campaign_dict
    from .profiles import asset_dict

    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    rows = (db.query(Review).filter_by(reviewee_id=user_id)
            .order_by(Review.id.desc()).all())
    count, avg = (db.query(func.count(Review.id), func.avg(Review.rating))
                  .filter(Review.reviewee_id == user_id).one())
    plats = (db.query(Platform).filter_by(owner_id=user_id).order_by(Platform.id.desc()).all()
             if u.is_platform_owner else [])
    from .. import bulk
    plat_ctx = bulk.for_listings(db, plats) if plats else None
    listings = [listing_dict(db, p, plat_ctx) for p in plats]
    # All of the owner's My Work samples across their listings.
    work_items = []
    if plats:
        work_items = [media_dict(m) for m in
                      db.query(PlatformMedia)
                        .filter(PlatformMedia.platform_id.in_([p.id for p in plats]),
                                PlatformMedia.kind == "work")
                        .order_by(PlatformMedia.id.desc()).all()]
    camp_rows = (db.query(Campaign).filter_by(business_id=user_id)
                 .order_by(Campaign.id.desc()).all() if u.is_business else [])
    camp_ctx = bulk.for_campaigns(db, camp_rows) if camp_rows else None
    campaigns = [campaign_dict(db, c, camp_ctx) for c in camp_rows]
    return {
        "id": u.id,
        "display_name": u.display_name or u.email,
        "is_business": u.is_business,
        "is_platform_owner": u.is_platform_owner,
        "avatar_url": f"/users/{u.id}/avatar" if u.avatar_path else None,
        "intro_video_url": f"/users/{u.id}/intro-video" if u.intro_video_path else None,
        # "Who we are" content
        "about_text": u.about_text or "",
        "links": u.links or [],
        "assets": [asset_dict(a) for a in
                   db.query(ProfileAsset).filter_by(user_id=u.id).order_by(ProfileAsset.id.desc()).all()],
        # Mirror of the listing's own sections, so the profile shows the same
        # Services & pricing / Audience & analytics / My Work / Past campaigns.
        "work": work_items,
        "past_campaigns": completed_campaigns_for(db, u.id) if u.is_platform_owner else [],
        # Business side: campaigns they've completed and paid out for.
        "business_past_campaigns": completed_campaigns_by_business(db, u.id) if u.is_business else [],
        "rating": round(float(avg), 1) if avg is not None else None,
        "review_count": count or 0,
        "reviews": [review_dict(r, db) for r in rows],
        "listings": listings,
        "campaigns": campaigns,
    }
