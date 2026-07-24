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
from ..models import DealStatus, WebhookEvent
from ..services import confirm_refund_from_charge, mark_deal_funded_from_pi
from ..stripe_client import stripe

router = APIRouter(tags=["webhooks"])

# Dispatch outcomes:
#   APPLIED  -> the money-state change took effect (or was already in effect).
#   IGNORED  -> nothing for us to do (event type we don't act on, or an object
#               not tied to any PromoSlot deal). Durably done; don't retry.
#   RETRY    -> a matching deal exists but the change could not be applied yet
#               (Stripe momentarily unreachable, or real state not ready). We
#               must NOT mark this processed — Stripe should redeliver later.
APPLIED, IGNORED, RETRY = "applied", "ignored", "retry"


def _dispatch(event, db) -> str:
    """Route a verified event to its handler and report the outcome.

    Handlers (each re-verifies real Stripe state before changing money-state):
      payment_intent.succeeded -> mark deal funded (P3)
      charge.refunded          -> confirm deal refunded (P5)
    Payout is executed synchronously by the release endpoint (the Transfer call
    succeeding is the authoritative money-move). Connected-account status (v2)
    syncs via live reads in /connect/status.

    We decide APPLIED vs RETRY from the *resulting* deal state, not from the
    event payload — so a handler that couldn't reach Stripe leaves the deal
    unchanged and we ask for redelivery instead of silently dropping the event.
    """
    etype = event["type"]
    if etype == "payment_intent.succeeded":
        deal = mark_deal_funded_from_pi(db, event["data"]["object"]["id"])
        if deal is None:
            return IGNORED  # PaymentIntent not tied to any PromoSlot deal
        return APPLIED if deal.funded_at is not None else RETRY
    if etype == "charge.refunded":
        deal = confirm_refund_from_charge(db, event["data"]["object"]["id"])
        if deal is None:
            return IGNORED
        return APPLIED if deal.status == DealStatus.REFUNDED else RETRY
    return IGNORED


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

    # Idempotency: skip only events we've already *finished*. An event that was
    # received but not yet processed (a prior attempt deferred or crashed) must
    # be re-attempted on Stripe's redelivery, not treated as a duplicate.
    rec = db.get(WebhookEvent, event_id)
    if rec is not None and rec.processed:
        return {"received": True, "duplicate": True}
    if rec is None:
        rec = WebhookEvent(id=event_id, type=event["type"], processed=False)
        db.add(rec)
        db.commit()

    outcome = _dispatch(event, db)

    if outcome == RETRY:
        # Leave the event un-processed and ask Stripe to redeliver later. A 5xx
        # is Stripe's signal to retry with backoff; the money-state change is
        # applied on a subsequent delivery once the real state is ready.
        raise HTTPException(status_code=503, detail="Deferred; awaiting redelivery")

    # APPLIED or IGNORED -> durably handled; safe to dedupe future redeliveries.
    rec.processed = True
    db.commit()
    return {"received": True, "type": event["type"], "recorded": True,
            "handled": outcome == APPLIED, "outcome": outcome}
