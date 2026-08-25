"""Public, one-click marketing-consent endpoints: the opt-in invite link in
a transactional email's footer, and the unsubscribe link a future marketing
email will carry. Both are token-based rather than login-gated deliberately
— someone should be able to opt in or out from the email itself, without
having to sign in first, the same way the reset-password link works before
a session exists.

The authenticated My Account toggle lives on /me/marketing-preference in
routers/profiles.py instead, alongside the rest of self-service prefs.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from fastapi import Depends

from .. import marketing
from ..db import get_db

router = APIRouter(prefix="/marketing", tags=["marketing"])


class MarketingTokenIn(BaseModel):
    token: str = Field(min_length=1)


@router.post("/optin")
def optin(body: MarketingTokenIn, db: Session = Depends(get_db)):
    user = marketing.consume_token(db, body.token, purpose="optin")
    if user is None:
        raise HTTPException(status_code=400,
                            detail="That link is invalid or has expired.")
    return {"ok": True, "opted_in": user.marketing_opt_in}


@router.post("/unsubscribe")
def unsubscribe(body: MarketingTokenIn, db: Session = Depends(get_db)):
    user = marketing.consume_token(db, body.token, purpose="unsubscribe")
    if user is None:
        raise HTTPException(status_code=400,
                            detail="That link is invalid or has already been used.")
    return {"ok": True, "opted_in": user.marketing_opt_in}
