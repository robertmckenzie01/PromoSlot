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
from ..models import Deal, DealStatus, WebhookEvent
from ..services import (close_dispute_from_event, confirm_refund_from_charge,
                        handle_payout_event, handle_transfer_reversed,
                        mark_affiliate_program_funded_from_pi, mark_affiliate_topup_funded_from_pi,
                        mark_deal_funded_from_pi, open_dispute_from_event,
                        record_dispute_funds_event, update_dispute_from_event)
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


_DISPUTE_EVENTS = {
    "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed",
    "charge.dispute.funds_withdrawn", "charge.dispute.funds_reinstated",
}


def _dispatch(event, db) -> str:
    """Route a verified event to its handler and report the outcome.

    Handlers (each re-verifies real Stripe state before changing money-state):
      payment_intent.succeeded -> mark deal funded (P3)
      charge.refunded          -> confirm deal refunded (P5)
      charge.dispute.*         -> open/update/close a chargeback dispute record
      payout.paid/failed       -> notify + audit a real bank payout's outcome
                                   (Connect-scoped; requires the destination to
                                   listen to connected-account events)
      transfer.reversed        -> notify + audit a reversed Transfer, matched by
                                   the Transfer id stored on the deal at payout time
    Payout is executed synchronously by the release endpoint (the Transfer call
    succeeding is the authoritative money-move for deal.paid_at/status). The
    payout.*/transfer.reversed handlers never touch deal state — they only
    surface what happened afterward to the real bank payout, which is a
    separate, later fact. Connected-account status (v2) syncs via live reads
    in /connect/status.

    We decide APPLIED vs RETRY from the *resulting* deal state, not from the
    event payload — so a handler that couldn't reach Stripe leaves the deal
    unchanged and we ask for redelivery instead of silently dropping the event.
    """
    etype = event["type"]
    if etype == "payment_intent.succeeded":
        pi_id = event["data"]["object"]["id"]
        deal = mark_deal_funded_from_pi(db, pi_id)
        if deal is not None:
            return APPLIED if deal.funded_at is not None else RETRY
        # Not a deal's PaymentIntent — try the other things a PaymentIntent
        # can fund on PromoSlot before giving up as IGNORED.
        program = mark_affiliate_program_funded_from_pi(db, pi_id)
        if program is not None:
            return APPLIED if program.status == "funded" else RETRY
        topup = mark_affiliate_topup_funded_from_pi(db, pi_id)
        if topup is None:
            return IGNORED  # PaymentIntent not tied to any PromoSlot deal, program, or top-up
        return APPLIED if topup.status == "funded" else RETRY
    if etype == "charge.refunded":
        deal = confirm_refund_from_charge(db, event["data"]["object"]["id"])
        if deal is None:
            return IGNORED
        return APPLIED if deal.status == DealStatus.REFUNDED else RETRY
    if etype in _DISPUTE_EVENTS:
        # Resolved from the event's own charge id, with no Stripe API call —
        # a charge unrelated to any PromoSlot deal is durably IGNORED without
        # ever touching Stripe. Only a charge we recognise goes any further.
        charge_id = event["data"]["object"].get("charge")
        deal = db.query(Deal).filter_by(charge_id=charge_id).first() if charge_id else None
        if deal is None:
            return IGNORED
        dispute_id = event["data"]["object"]["id"]
        if etype == "charge.dispute.created":
            d = open_dispute_from_event(db, dispute_id, deal)
        elif etype == "charge.dispute.updated":
            d = update_dispute_from_event(db, dispute_id, deal)
        elif etype == "charge.dispute.closed":
            d = close_dispute_from_event(db, dispute_id, deal)
        elif etype == "charge.dispute.funds_withdrawn":
            d = record_dispute_funds_event(db, dispute_id, deal, "withdrawn")
        else:
            d = record_dispute_funds_event(db, dispute_id, deal, "reinstated")
        return APPLIED if d is not None else RETRY
    if etype in ("payout.paid", "payout.failed"):
        outcome = handle_payout_event(db, event, succeeded=(etype == "payout.paid"))
        return APPLIED if outcome == "applied" else IGNORED
    if etype == "transfer.reversed":
        outcome = handle_transfer_reversed(db, event)
        return APPLIED if outcome == "applied" else IGNORED
    return IGNORED


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    # Two possible signing secrets: the original "Your account" destination,
    # and the "Connected accounts" one added for payout.paid/payout.failed
    # (Stripe requires a separate destination + secret for connected-account
    # events — one endpoint URL, two destinations, two secrets). Try each;
    # only reject if neither verifies.
    secrets = [s for s in (settings.stripe_webhook_secret,
                          settings.stripe_webhook_secret_connect) if s]
    if not secrets:
        # We refuse to accept unverifiable events rather than trust them.
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    event = None
    for secret in secrets:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, secret)
            break
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:  # type: ignore[attr-defined]
            continue  # try the next secret before giving up
    if event is None:
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
