"""Domain services shared across routers and webhook handlers."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from .models import ConnectedAccount, Deal, DealStatus, Notification, Payment
from .stripe_client import stripe


def _g(obj, *path):
    """Safely walk an attribute/dict path on a Stripe v2 object or dict."""
    cur = obj
    for key in path:
        if cur is None:
            return None
        cur = cur.get(key) if isinstance(cur, dict) else getattr(cur, key, None)
    return cur


def transfers_status_of(acct) -> Optional[str]:
    """Status of the recipient's stripe_transfers capability on a v2 account."""
    return _g(acct, "configuration", "recipient", "capabilities",
              "stripe_balance", "stripe_transfers", "status")


def requirements_outstanding(acct) -> bool:
    """True if the account still needs onboarding before it can receive transfers."""
    # If the payout capability isn't active, onboarding is by definition incomplete.
    if transfers_status_of(acct) != "active":
        return True
    # Capability active but Stripe may still list currently-due items.
    entries = _g(acct, "requirements", "entries") or []
    for e in entries:
        if _g(e, "minimum_deadline", "status") == "currently_due":
            return True
    return bool(_g(acct, "requirements", "summary", "minimum_currently_due"))


def sync_connected_account(db: Session, acct) -> Optional[ConnectedAccount]:
    """Mirror a Stripe v2 account's payout capability onto our row.

    Only updates accounts we actually own a row for.
    """
    acct_id = _g(acct, "id")
    if not acct_id:
        return None
    row = db.query(ConnectedAccount).filter_by(stripe_account_id=acct_id).first()
    if row is None:
        return None
    status = transfers_status_of(acct)
    row.transfers_status = status
    row.transfers_active = (status == "active")
    row.requirements_due = requirements_outstanding(acct)
    db.commit()
    db.refresh(row)
    return row


def onboarding_complete(row: ConnectedAccount) -> bool:
    """A platform owner can only be paid once transfers are active."""
    return bool(row and row.transfers_active)


def mark_deal_funded_from_pi(db: Session, pi_id: str) -> Optional[Deal]:
    """Mark a deal funded — ONLY if Stripe confirms the PaymentIntent succeeded.

    Called from the payment_intent.succeeded webhook. We never trust the event
    payload alone: we re-retrieve the PaymentIntent from Stripe and require
    status == 'succeeded'. Idempotent: a deal already funded is left untouched.
    """
    deal = db.query(Deal).filter_by(payment_intent_id=pi_id).first()
    if deal is None or deal.funded_at is not None:
        return deal

    try:
        pi = stripe.PaymentIntent.retrieve(pi_id)
    except Exception:
        return deal
    if getattr(pi, "status", None) != "succeeded":
        return deal  # gate: real success only

    deal.funded_at = datetime.utcnow()
    deal.status = DealStatus.FUNDED
    deal.charge_id = getattr(pi, "latest_charge", None)

    pay = db.query(Payment).filter_by(stripe_payment_intent_id=pi_id).first()
    if pay is not None:
        pay.status = "succeeded"

    # Real event -> real notification for the platform owner.
    db.add(Notification(
        user_id=deal.platform_owner_id,
        type="deal_funded",
        body=f"Deal #{deal.id} is funded and secured in escrow.",
        ref=str(deal.id),
    ))
    db.commit()
    db.refresh(deal)
    return deal
