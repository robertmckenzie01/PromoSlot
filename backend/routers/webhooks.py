"""Stripe webhook receiver.

This is the source of truth for money-state changes. Every event is:
  1. signature-verified against STRIPE_WEBHOOK_SECRET (reject if not),
  2. de-duplicated via the webhook_events table (idempotency),
  3. recorded, then dispatched to a handler.

In P0 there are no money handlers yet — events are verified and recorded only.
Later phases (funding, payout, refund) attach handlers keyed on event type.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import WebhookEvent
from ..services import mark_deal_funded_from_pi
from ..stripe_client import stripe

router = APIRouter(tags=["webhooks"])


def _dispatch(event, db):
    """Route a verified event to its handler. Returns True if handled.

    Handlers (each re-verifies real Stripe state before changing money-state):
      payment_intent.succeeded -> mark deal funded (P3)
      transfer.* / charge.refunded -> P5
    Connected-account status (v2) syncs via live reads in /connect/status.
    """
    etype = event["type"]
    if etype == "payment_intent.succeeded":
        mark_deal_funded_from_pi(db, event["data"]["object"]["id"])
        return True
    return False


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.stripe_webhook_secret:
        # We refuse to accept unverifiable events rather than trust them.
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:  # type: ignore[attr-defined]
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event["id"]

    # Idempotency: never process the same event twice.
    if db.get(WebhookEvent, event_id):
        return {"received": True, "duplicate": True}

    rec = WebhookEvent(id=event_id, type=event["type"], processed=False)
    db.add(rec)
    db.commit()

    handled = _dispatch(event, db)
    if handled:
        rec.processed = True
        db.commit()

    return {"received": True, "type": event["type"], "recorded": True, "handled": handled}
