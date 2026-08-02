"""Health + Stripe connectivity checks. The Stripe check makes a REAL API call."""
from fastapi import APIRouter, HTTPException

from ..config import settings
from ..stripe_client import stripe

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok", "service": "promoslot-api"}


@router.get("/health/storage")
def storage_health():
    """Which storage backend is live, and is the bucket actually reachable?

    Use this after a deploy to confirm uploads are going to object storage
    rather than the container's ephemeral disk.
    """
    from ..storage import backend_name, remote_enabled
    info = {"backend": backend_name(), "remote": remote_enabled(),
            "durable_across_redeploys": remote_enabled()}
    if not remote_enabled():
        info["warning"] = ("Local disk is EPHEMERAL on Render: uploads are destroyed "
                           "on every deploy/restart. Set the R2_* env vars.")
        return info
    # Prove the credentials really work, rather than just being present.
    try:
        from ..storage import _s3
        from ..config import settings
        _s3().head_bucket(Bucket=settings.r2_bucket)
        info["bucket_reachable"] = True
    except Exception as e:
        info["bucket_reachable"] = False
        info["error"] = str(e)[:200]
    return info


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
