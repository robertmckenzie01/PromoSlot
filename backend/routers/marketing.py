"""Public, one-click marketing-consent endpoints: the opt-in invite link in
a transactional email's footer, and the unsubscribe link a future marketing
email will carry. Both are token-based rather than login-gated deliberately
— someone should be able to opt in or out from the email itself, without
having to sign in first, the same way the reset-password link works before
a session exists.

The authenticated My Account toggle lives on /me/marketing-preference in
routers/profiles.py instead, alongside the rest of self-service prefs.

Also carries /marketing/cron/send-campaign — the batch-send trigger. That
one is deliberately NOT login-gated either, but for the opposite reason: it
has no human present to log in. It's meant to be called by an external
monthly scheduler (a Render Cron Job, or equivalent), authenticated with a
shared secret the same way Stripe/Resend webhooks are — see
config.marketing_cron_secret and routers/webhooks.py for the same pattern.
"""
import hmac

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import marketing
from ..config import settings
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


@router.post("/cron/send-campaign")
def cron_send_campaign(request: Request, db: Session = Depends(get_db)):
    """Sends the next pending campaign in marketing.CAMPAIGN_REGISTRY to
    every opted-in user. Meant to be called by an external scheduler, not a
    person — see the module docstring above. Safe to call more than once:
    a campaign that's already been sent is permanently done (see
    marketing.send_campaign_now()), so an accidental double-trigger just
    returns sent=False rather than emailing everyone twice.
    """
    if not settings.marketing_cron_configured:
        raise HTTPException(status_code=503,
                            detail="Marketing cron secret is not configured.")
    provided = request.headers.get("x-cron-secret", "")
    if not hmac.compare_digest(provided, settings.marketing_cron_secret):
        raise HTTPException(status_code=403, detail="Forbidden")
    return marketing.send_campaign_now(db)
