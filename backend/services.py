"""Domain services shared across routers and webhook handlers."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from .models import (
    ConnectedAccount, Deal, DealStatus, Notification, Payment, Proof, Transfer, User,
    Verification,
)
from .stripe_client import stripe


def deal_money(listed_price: int, seller_pct: int, buyer_pct: int) -> dict:
    """Split-fee breakdown, all fees on the agreed/listed price (pence).

    Example ($100 listed, 10% seller / 5% buyer):
      buyer_fee=500, seller_fee=1000, charge_amount=10500 (business pays $105),
      net_to_owner=9000 (owner gets $90), platform_take=1500 ($15).
    """
    buyer_fee = listed_price * buyer_pct // 100
    seller_fee = listed_price * seller_pct // 100
    return {
        "listed_price": listed_price,
        "buyer_fee": buyer_fee,             # buyer protection fee, added at funding
        "seller_fee": seller_fee,           # seller fee, deducted at payout
        "charge_amount": listed_price + buyer_fee,   # what the business is charged
        "net_to_owner": listed_price - seller_fee,   # what the owner receives
        "platform_take": buyer_fee + seller_fee,
    }


def deal_money_for(deal) -> dict:
    """Breakdown for a specific deal, using the fee rates locked on it."""
    return deal_money(deal.listed_price, deal.seller_fee_percent, deal.buyer_fee_percent)


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
        body=f"Deal #{deal.id} is funded and held pending verification.",
        ref=str(deal.id),
    ))
    db.commit()
    db.refresh(deal)
    return deal


def verify_delivery(db: Session, deal: Deal, reviewer: User, decision: str,
                    notes: Optional[str] = None) -> Verification:
    """Record a human reviewer's verification decision on submitted evidence.

    Only ever called from the reviewer-only endpoint, on a funded deal that has
    real stored proof. Sets verified_at on approval — never by a timer, a step
    being reached, or a deal party clicking through their own flow.
    """
    v = Verification(deal_id=deal.id, reviewer_id=reviewer.id,
                     decision=decision, notes=notes)
    db.add(v)

    if decision == "approved":
        deal.verified_at = datetime.utcnow()
        deal.status = DealStatus.VERIFIED
        db.add(Notification(user_id=deal.platform_owner_id, type="deal_verified",
                            body=f"Deal #{deal.id} delivery verified — payout to follow.",
                            ref=str(deal.id)))
        db.add(Notification(user_id=deal.business_id, type="deal_verified",
                            body=f"Deal #{deal.id} delivery verified by PromoSlot.",
                            ref=str(deal.id)))
    else:
        deal.status = DealStatus.IN_DELIVERY
        db.add(Notification(user_id=deal.platform_owner_id, type="deal_revision",
                            body=f"Deal #{deal.id} evidence needs revision before it can be verified.",
                            ref=str(deal.id)))

    db.commit()
    db.refresh(deal)
    return v


def create_deal_payout(db: Session, deal: Deal, destination: str) -> Transfer:
    """Move funds to the platform owner via a REAL Stripe Transfer.

    The deal is marked PAID only because stripe.Transfer.create() actually
    succeeded (money moved from the platform balance to the connected account).
    Caller must have already verified funded + verified + not paid + destination
    payout-enabled. Raises on Stripe failure so the caller leaves the deal unpaid.
    """
    m = deal_money_for(deal)
    net = m["net_to_owner"]

    tr = stripe.Transfer.create(
        amount=net,
        currency=deal.currency,
        destination=destination,
        # Draw specifically from this deal's charge (correct availability/timing).
        source_transaction=deal.charge_id,
        transfer_group=f"deal_{deal.id}",
        metadata={"deal_id": str(deal.id), "promoslot": "deal_payout"},
    )

    deal.transfer_id = tr.id
    deal.paid_at = datetime.utcnow()
    deal.status = DealStatus.PAID
    db.add(Transfer(
        deal_id=deal.id,
        stripe_transfer_id=tr.id,
        destination_account=destination,
        amount=net,
        currency=deal.currency,
        status="paid",
    ))
    db.add(Notification(user_id=deal.platform_owner_id, type="payout_sent",
                        body=f"Payout of {deal.currency.upper()} {net/100:.2f} sent for deal #{deal.id} "
                             f"(listed price minus {deal.seller_fee_percent}% seller fee).",
                        ref=str(deal.id)))
    db.add(Notification(user_id=deal.business_id, type="deal_completed",
                        body=f"Deal #{deal.id} completed — payout released to the platform owner.",
                        ref=str(deal.id)))
    db.commit()
    db.refresh(deal)
    return tr


def refund_deal(db: Session, deal: Deal, reason: str = "requested_by_customer"):
    """Refund the business via a REAL Stripe Refund on the deal's PaymentIntent.

    Only marks REFUNDED because stripe.Refund.create() actually succeeded.
    Caller must have ensured the deal is funded and not already paid out.
    """
    rf = stripe.Refund.create(
        payment_intent=deal.payment_intent_id,
        reason=reason,
        metadata={"deal_id": str(deal.id), "promoslot": "deal_refund"},
    )
    deal.refund_id = rf.id
    deal.status = DealStatus.REFUNDED
    db.add(Notification(user_id=deal.business_id, type="deal_refunded",
                        body=f"Deal #{deal.id} was refunded to you.", ref=str(deal.id)))
    db.add(Notification(user_id=deal.platform_owner_id, type="deal_refunded",
                        body=f"Deal #{deal.id} was refunded to the business.", ref=str(deal.id)))
    db.commit()
    db.refresh(deal)
    return rf


def confirm_refund_from_charge(db: Session, charge_id: str) -> Optional[Deal]:
    """Idempotently mark a deal refunded from a charge.refunded webhook.

    Re-verifies with Stripe that the charge is actually refunded before changing
    state (handles refunds initiated from the Stripe dashboard too).
    """
    deal = db.query(Deal).filter_by(charge_id=charge_id).first()
    if deal is None or deal.status == DealStatus.REFUNDED:
        return deal
    try:
        ch = stripe.Charge.retrieve(charge_id)
    except Exception:
        return deal
    if not getattr(ch, "refunded", False):
        return deal
    deal.status = DealStatus.REFUNDED
    db.commit()
    db.refresh(deal)
    return deal
