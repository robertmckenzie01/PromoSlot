"""Business campaigns: create + browse.

Serializers return objects shaped like the front end's campaign objects.
Ratings/applicants come only from real data (a new campaign has none).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Campaign, Review, User

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


def campaign_dict(db: Session, c: Campaign) -> dict:
    biz = db.get(User, c.business_id)
    count, avg = (db.query(func.count(Review.id), func.avg(Review.rating))
                  .filter(Review.reviewee_id == c.business_id).one())
    t = c.terms or {}
    return {
        "id": f"c{c.id}",
        "company": biz.display_name if biz else "",
        "industry": c.industry or "",
        "title": c.title,
        "verified": False,
        "rating": round(float(avg), 1) if avg is not None else None,
        "reviewCount": count or 0,
        "posted": "just now",
        "applicants": 0,
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
    rows = db.query(Campaign).order_by(Campaign.id.desc()).all()
    return [campaign_dict(db, c) for c in rows]


@router.get("/mine")
def my_campaigns(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Campaign).filter_by(business_id=user.id).order_by(Campaign.id.desc()).all()
    return [campaign_dict(db, c) for c in rows]


@router.get("/{campaign_id:int}")
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.get(Campaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign_dict(db, c)
