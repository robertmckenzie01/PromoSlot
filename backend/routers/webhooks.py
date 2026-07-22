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
from ..stripe_client import stripe

router = APIRouter(tags=["webhooks"])


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

    db.add(WebhookEvent(id=event_id, type=event["type"], processed=False))
    db.commit()

    # P0: verified + recorded only. Money handlers wired in later phases:
    #   payment_intent.succeeded  -> mark deal funded
    #   account.updated           -> sync connected-account capabilities
    #   transfer.created/paid     -> mark deal paid
    #   charge.refunded           -> mark deal refunded
    return {"received": True, "type": event["type"], "recorded": True}
