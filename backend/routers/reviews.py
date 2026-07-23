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


def review_dict(r: Review) -> dict:
    return {
        "id": r.id,
        "deal_id": r.deal_id,
        "author_id": r.author_id,
        "reviewee_id": r.reviewee_id,
        "rating": r.rating,
        "text": r.text,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


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
    return [review_dict(r) for r in rows]


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
        "reviews": [review_dict(r) for r in rows],
    }
