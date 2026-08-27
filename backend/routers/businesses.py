"""A business's standalone profile record.

Previously this had no backend at all — see models.Business's docstring.
This router is deliberately small: create-or-update the one row a
business-role identity owns, and read it back. Nothing here touches
verification directly; see routers/verification.py for that.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import Business, User

router = APIRouter(prefix="/businesses", tags=["businesses"])


def business_dict(b: Business) -> dict:
    return {
        "id": b.id, "owner_id": b.owner_id, "company": b.company,
        "product": b.product, "industry": b.industry, "target": b.target,
        "verified": b.verified,
        "has_stripe_account": bool(b.stripe_account_id),
    }


@router.get("/me")
def my_business(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = db.query(Business).filter_by(owner_id=user.id).first()
    return business_dict(b) if b else None


class BusinessIn(BaseModel):
    company: str
    product: Optional[str] = None
    industry: Optional[str] = None
    target: Optional[str] = None


@router.post("")
def upsert_business(body: BusinessIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Create-or-update. Editing company/product/industry/target after a
    business is already verified does NOT retroactively unverify it —
    that's a real gap (the Stripe check verified the OLD legal name against
    the OLD profile), tracked separately rather than silently ignored: see
    task list, 're-verify on material profile change'."""
    if not user.is_business:
        raise HTTPException(status_code=403, detail="Only a business account has a business profile")
    b = db.query(Business).filter_by(owner_id=user.id).first()
    if b is None:
        b = Business(owner_id=user.id, company=body.company)
        db.add(b)
    b.company = body.company
    b.product = body.product
    b.industry = body.industry
    b.target = body.target
    db.commit()
    db.refresh(b)
    return business_dict(b)
