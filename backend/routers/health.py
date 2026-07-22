"""Health + Stripe connectivity checks. The Stripe check makes a REAL API call."""
from fastapi import APIRouter, HTTPException

from ..config import settings
from ..stripe_client import stripe

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok", "service": "promoslot-api"}


@router.get("/stripe/health")
def stripe_health():
    """Proves live Stripe connectivity from real backend code (not simulated)."""
    if not settings.stripe_configured:
        raise HTTPException(status_code=503, detail="Stripe secret key not configured")
    try:
        acct = stripe.Account.retrieve()
    except stripe.error.StripeError as e:  # type: ignore[attr-defined]
        raise HTTPException(status_code=502, detail=f"Stripe error: {e.user_message or str(e)}")
    return {
        "stripe": "connected",
        "account_id": getattr(acct, "id", None),
        "country": getattr(acct, "country", None),
        "livemode": getattr(acct, "livemode", None),
        "charges_enabled": getattr(acct, "charges_enabled", None),
        "payouts_enabled": getattr(acct, "payouts_enabled", None),
    }
