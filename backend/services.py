"""Domain services shared across routers and webhook handlers."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from . import audit
from .deal_state import can_transition
from .models import (
    ConnectedAccount, Deal, DealStatus, Dispute, DisputeEvent, Notification, Payment,
    Proof, Transfer, User, Verification,
)
from .permissions import Perm, ROLE_PERMISSIONS
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


def check_instant_eligibility(stripe_account_id: str) -> dict:
    """Live check: does this connected account have any external account
    (bank or card) Stripe will do an Instant Payout to right now?

    Never cached — Stripe can re-assess instant eligibility over time, and
    caching a stale "yes" could send an owner down a payout path that fails.

    Stripe's response objects here (ListObject/StripeObject) do NOT support
    dict-style .get() the way a plain dict does — calling .get() on them
    falls through to their __getattr__/__getitem__ machinery and raises a
    raw KeyError instead of returning a default. Every Stripe object is
    converted to a plain dict via .to_dict() (recursive) immediately after
    the API call, before anything touches it with .get().
    """
    destinations = []
    for obj_type in ("bank_account", "card"):
        try:
            accounts = stripe.Account.list_external_accounts(
                stripe_account_id, object=obj_type, limit=10)
            data = accounts.to_dict().get("data", [])
        except Exception:
            continue
        for ext in data:
            methods = ext.get("available_payout_methods") or []
            if "instant" in methods:
                destinations.append({
                    "id": ext.get("id"), "type": obj_type,
                    "last4": ext.get("last4"), "brand": ext.get("brand") or ext.get("bank_name"),
                })
    return {"eligible": bool(destinations), "destinations": destinations}


def try_instant_payout(db: Session, deal: Deal, connected_account: ConnectedAccount) -> dict:
    """Convert an already-PAID deal's payout into a real Stripe Instant Payout,
    on top of the Transfer create_deal_payout() already made into the owner's
    Connect balance. Never touches deal.paid_at/status — those are already
    set. Only ever sets the instant_* detail fields on success.

    Deliberately returns a status dict instead of raising for expected/
    recoverable outcomes (not eligible, no balance, Stripe declines it), so
    an auto-triggered attempt (opted-in owner) can never break the main
    payout-release flow it's piggybacking on. Genuine Stripe API failures
    are caught too, for the same reason — see reason strings below.
    """
    if deal.paid_at is None:
        return {"ok": False, "reason": "not_paid_yet"}
    if deal.instant_payout_id:
        return {"ok": False, "reason": "already_instant"}

    elig = check_instant_eligibility(connected_account.stripe_account_id)
    if not elig["eligible"]:
        return {"ok": False, "reason": "not_eligible"}

    try:
        bal_obj = stripe.Balance.retrieve(
            stripe_account=connected_account.stripe_account_id,
            expand=["instant_available.net_available"],
        )
        bal = bal_obj.to_dict()  # see check_instant_eligibility: .get() isn't safe on the raw object
    except Exception as e:
        return {"ok": False, "reason": f"balance_lookup_failed: {e}"}

    # net_available.amount is ALREADY net of whatever instant-payout fee is
    # configured on the platform (Stripe requires using this exact figure
    # when monetizing instant payouts via Application Fees — the owner bears
    # this fee, per PromoSlot's pricing decision, not PromoSlot).
    eligible_ids = {d["id"] for d in elig["destinations"]}
    dest_id, net_amount = None, None
    for bucket in (bal.get("instant_available") or []):
        if bucket.get("currency") != deal.currency:
            continue
        for entry in (bucket.get("net_available") or []):
            if entry.get("destination") in eligible_ids:
                dest_id, net_amount = entry["destination"], entry["amount"]
                break
        if dest_id:
            break

    if not dest_id or not net_amount:
        return {"ok": False, "reason": "no_instant_balance_available"}

    try:
        payout = stripe.Payout.create(
            amount=net_amount,
            currency=deal.currency,
            method="instant",
            destination=dest_id,
            metadata={"deal_id": str(deal.id), "promoslot": "instant_payout"},
            stripe_account=connected_account.stripe_account_id,
        )
    except Exception as e:
        return {"ok": False, "reason": f"payout_failed: {e}"}

    deal.instant_payout_id = payout.id
    deal.instant_net_amount = net_amount
    deal.instant_requested_at = datetime.utcnow()
    db.add(Notification(
        user_id=deal.platform_owner_id, type="instant_payout_sent",
        body=(f"Instant payout sent for deal #{deal.id} — "
              f"{deal.currency.upper()} {net_amount/100:.2f} should land in your account "
              f"within about 30 minutes (Stripe's instant-payout fee already deducted)."),
        ref=str(deal.id)))
    db.commit()
    db.refresh(deal)
    return {"ok": True, "payout_id": payout.id, "net_amount": net_amount}


def _payout_admin_ids(db: Session):
    """Everyone who can act on a failed/reversed payout (same permission that
    gates releasing one in the first place)."""
    roles = [r for r, perms in ROLE_PERMISSIONS.items() if Perm.PAYOUT_RELEASE in perms]
    if not roles:
        return []
    rows = (db.query(User.id)
            .filter(User.role.in_(roles),
                    User.suspended_at.is_(None), User.banned_at.is_(None)).all())
    return [r[0] for r in rows]


def handle_payout_event(db: Session, event: dict, succeeded: bool) -> str:
    """payout.paid / payout.failed on a connected account's real bank/card payout.

    Distinct from create_deal_payout()'s Transfer: money can successfully move
    into the owner's Connect balance (Transfer succeeds, deal marked PAID) while
    the SEPARATE, later real-world payout to their actual bank still fails
    (closed account, mismatched details, bank rejects it). Without this handler
    that failure is invisible — the deal stays PAID forever and nobody is ever
    told the owner didn't actually receive the money.

    Delivered as a Connect-scoped event (has a top-level "account" field) — the
    destination must have "listen to events on connected accounts" enabled, or
    these never arrive at all.

    Deliberately never touches deal.status/paid_at/instant_payout_id — those
    stay true to "the Transfer into their Connect balance succeeded", a real
    and distinct fact from "the bank payout succeeded". This only notifies +
    audits, so a human decides what to do next. A full reconciliation/ledger
    system is a bigger, deliberate design (see Phase 2 backlog), not this.
    """
    account_id = event["account"] if "account" in event else None
    if not account_id:
        return "ignored"  # not a Connect-scoped event we can attribute to anyone

    ca = db.query(ConnectedAccount).filter_by(stripe_account_id=account_id).first()
    if ca is None:
        return "ignored"  # not one of our connected accounts

    # Stripe's response objects don't support dict-style .get() — see the fix
    # in check_instant_eligibility. Convert to a plain dict before touching it.
    payout = event["data"]["object"].to_dict()
    payout_id = payout.get("id")
    amount = payout.get("amount") or 0
    currency = (payout.get("currency") or "gbp").upper()
    failure_message = payout.get("failure_message")
    deal_id_hint = (payout.get("metadata") or {}).get("deal_id")  # only set for our own instant payouts

    deal_note = ""
    if deal_id_hint:
        try:
            deal = db.query(Deal).filter_by(id=int(deal_id_hint)).first()
        except (TypeError, ValueError):
            deal = None
        if deal is not None:
            deal_note = f" (deal #{deal.id})"

    if succeeded:
        # Routine/expected outcome — audit trail only, no notification noise.
        audit.record(db, actor=None, action="payout.paid", target_type="connected_account",
                     target_id=ca.id, new_state={"payout_id": payout_id, "amount": amount,
                                                 "currency": currency},
                     reason=f"Real bank payout confirmed{deal_note}.")
        db.commit()
        return "applied"

    db.add(Notification(
        user_id=ca.user_id, type="payout_failed",
        body=(f"A payout of {currency} {amount/100:.2f} to your bank/card failed"
              f"{deal_note}. Your money is safe and hasn't been lost — PromoSlot's team "
              f"will be in touch to help resolve this."),
        ref=str(ca.id)))
    for uid in _payout_admin_ids(db):
        db.add(Notification(
            user_id=uid, type="payout_failed_admin",
            body=(f"Payout FAILED for owner #{ca.user_id}{deal_note}: {currency} {amount/100:.2f}. "
                  f"Stripe says: {failure_message or 'no reason given'}. Needs manual follow-up."),
            ref=f"payout:{payout_id}"))
    audit.record(db, actor=None, action="payout.failed", target_type="connected_account",
                 target_id=ca.id, new_state={"payout_id": payout_id, "amount": amount,
                                             "currency": currency, "failure_message": failure_message},
                 reason=f"Real bank payout failed{deal_note} — needs manual review.")
    db.commit()
    return "applied"


def handle_transfer_reversed(db: Session, event: dict) -> str:
    """transfer.reversed — the platform-level Transfer that already moved money
    into an owner's Connect balance got reversed back to us.

    Platform-scoped (no "account" field needed) — matched to a deal via the
    Transfer id stored on it at payout time. Deliberately doesn't touch
    deal.status/paid_at; this is a rare, serious event that needs a human to
    look at it, not an automated state change.
    """
    tr = event["data"]["object"].to_dict()
    transfer_id = tr.get("id")
    deal = db.query(Deal).filter_by(transfer_id=transfer_id).first()
    if deal is None:
        return "ignored"

    amount_reversed = tr.get("amount_reversed") or 0
    for uid in (deal.business_id, deal.platform_owner_id):
        db.add(Notification(
            user_id=uid, type="payout_reversed",
            body=(f"A payout for deal #{deal.id} was reversed by Stripe. "
                  f"PromoSlot's team will review and follow up with you directly."),
            ref=str(deal.id)))
    for uid in _payout_admin_ids(db):
        db.add(Notification(
            user_id=uid, type="payout_reversed_admin",
            body=(f"Transfer reversed for deal #{deal.id} "
                  f"({deal.currency.upper()} {amount_reversed/100:.2f}) — needs manual review."),
            ref=str(deal.id)))
    audit.record(db, actor=None, action="transfer.reversed", target_type="deal",
                 target_id=deal.id,
                 new_state={"transfer_id": transfer_id, "amount_reversed": amount_reversed},
                 reason="Stripe transfer.reversed webhook — needs manual review, deal status left untouched.")
    db.commit()
    return "applied"


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


# ============================================================================
# Chargeback disputes (charge.dispute.* webhooks)
#
# PromoSlot's Connect config (separate charges & transfers, fees_collector /
# losses_collector = "application" — see routers/connect.py) makes PromoSlot,
# never the platform owner's connected account, the party Stripe holds
# responsible for a dispute. That's the assumption these functions rely on: an
# admin manages the response, so reason codes / the Stripe dispute id / the
# evidence deadline stay admin-only (routers/disputes.py). Both parties only
# ever get a read-only "payment dispute under review" state, derived from
# Deal.dispute_status — never the raw Stripe status or reason.
# ============================================================================

def _dispute_admin_ids(db: Session):
    """Everyone who can work the disputes queue (same permission that gates it)."""
    roles = [r for r, perms in ROLE_PERMISSIONS.items() if Perm.DISPUTE_MANAGE in perms]
    if not roles:
        return []
    rows = (db.query(User.id)
            .filter(User.role.in_(roles),
                    User.suspended_at.is_(None), User.banned_at.is_(None)).all())
    return [r[0] for r in rows]


def _notify_parties_and_admins(db: Session, deal: Deal, dispute: Dispute,
                               party_body: str, admin_body: str, notif_type: str) -> None:
    for uid in (deal.business_id, deal.platform_owner_id):
        db.add(Notification(user_id=uid, type=notif_type, body=party_body, ref=str(deal.id)))
    for uid in _dispute_admin_ids(db):
        db.add(Notification(user_id=uid, type=f"{notif_type}_admin", body=admin_body,
                            ref=f"dispute:{dispute.id}"))


def open_dispute_from_event(db: Session, stripe_dispute_id: str, deal: Deal) -> Optional[Dispute]:
    """Idempotently create a Dispute row from a charge.dispute.created webhook.

    `deal` is resolved by the caller from the event's charge id before this is
    called — a charge with no matching deal never reaches here (that's the
    webhook dispatcher's IGNORED case). Re-retrieves the Dispute from Stripe
    rather than trusting the webhook payload alone, matching
    mark_deal_funded_from_pi / confirm_refund_from_charge. Returns None only
    when Stripe couldn't be reached this attempt (caller asks for redelivery).
    """
    existing = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if existing is not None:
        return existing  # already recorded — idempotent on redelivery

    try:
        dp = stripe.Dispute.retrieve(stripe_dispute_id)
    except Exception:
        return None

    payout_already_released = deal.paid_at is not None
    due_by = getattr(dp, "evidence_details", None) and dp.evidence_details.get("due_by")

    dispute = Dispute(
        deal_id=deal.id,
        stripe_dispute_id=dp.id,
        charge_id=deal.charge_id,
        amount=dp.amount,
        currency=dp.currency,
        reason=getattr(dp, "reason", None),
        status=dp.status,
        evidence_due_by=datetime.utcfromtimestamp(due_by) if due_by else None,
        payout_already_released=payout_already_released,
        deal_status_before=None if payout_already_released else deal.status,
    )
    db.add(dispute)
    deal.dispute_status = dp.status

    # Freeze an unpaid deal so nothing else can happen to it mid-dispute — but
    # only if that's actually a legal move from its current state (defensive;
    # every real pre-payout state allows -> DISPUTED, see deal_state.py). Must
    # capture status_before_dispute BEFORE overwriting deal.status, or the
    # revert on a won/withdrawn outcome has nothing to go back to.
    frozen = False
    if not payout_already_released and can_transition(deal.status, DealStatus.DISPUTED):
        deal.status_before_dispute = deal.status
        deal.status = DealStatus.DISPUTED
        frozen = True

    db.commit()
    db.refresh(dispute)

    db.add(DisputeEvent(
        dispute_id=dispute.id, kind="system",
        body=(f"Dispute opened — reason: {dispute.reason or 'unspecified'}. "
              f"{'Deal frozen pending resolution.' if frozen else ''}"
              f"{'Payout had already been released — this is an absorbed loss, not a freeze.' if payout_already_released else ''}"),
    ))
    _notify_parties_and_admins(
        db, deal, dispute,
        party_body=(f"A payment dispute has been opened on deal #{deal.id}. "
                    f"PromoSlot is reviewing it and will contact you if evidence is needed."),
        admin_body=(f"Payment dispute opened on deal #{deal.id} "
                    f"({dispute.currency.upper()} {dispute.amount/100:.2f})"
                    f"{' — payout already released' if payout_already_released else ''}."),
        notif_type="dispute_opened",
    )
    db.commit()
    db.refresh(dispute)
    return dispute


def update_dispute_from_event(db: Session, stripe_dispute_id: str, deal: Deal) -> Optional[Dispute]:
    """Handle charge.dispute.updated — status/evidence-deadline changes."""
    dispute = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if dispute is None:
        return open_dispute_from_event(db, stripe_dispute_id, deal)  # missed the opener
    if dispute.closed_at is not None:
        return dispute  # already closed — an update landing late changes nothing

    try:
        dp = stripe.Dispute.retrieve(stripe_dispute_id)
    except Exception:
        return None

    due_by = getattr(dp, "evidence_details", None) and dp.evidence_details.get("due_by")
    new_due_by = datetime.utcfromtimestamp(due_by) if due_by else None
    if dp.status != dispute.status:
        db.add(DisputeEvent(dispute_id=dispute.id, kind="system",
                            body=f"Status changed: {dispute.status} → {dp.status}."))
    dispute.status = dp.status
    dispute.evidence_due_by = new_due_by
    deal.dispute_status = dp.status
    db.commit()
    db.refresh(dispute)
    return dispute


def close_dispute_from_event(db: Session, stripe_dispute_id: str, deal: Deal) -> Optional[Dispute]:
    """Handle charge.dispute.closed — resolves the deal's frozen/paid state.

    won | warning_closed  -> unpaid deal returns to exactly the status it was
                              frozen from; a paid deal was never touched anyway.
    lost                  -> Stripe has already reversed the charge as part of
                              losing the dispute (no separate Refund call is
                              valid or needed). An unpaid deal is marked
                              REFUNDED to match reality. A paid deal stays PAID
                              — per policy, no automatic clawback from the
                              platform owner — but the Dispute row's outcome
                              records this as a real absorbed loss to reconcile.
    """
    dispute = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if dispute is None:
        dispute = open_dispute_from_event(db, stripe_dispute_id, deal)
        if dispute is None:
            return None
    if dispute.closed_at is not None:
        return dispute  # idempotent on redelivery

    try:
        dp = stripe.Dispute.retrieve(stripe_dispute_id)
    except Exception:
        return None
    if dp.status not in ("won", "lost", "warning_closed"):
        return None  # not actually closed yet despite the event name — wait for the real close

    dispute.status = dp.status
    dispute.outcome = dp.status
    dispute.closed_at = datetime.utcnow()

    if not dispute.payout_already_released:
        if dp.status == "lost":
            deal.status = DealStatus.REFUNDED
        else:  # won | warning_closed — restore exactly what it was frozen from.
               # deal.status_before_dispute is the live working value; Dispute
               # .deal_status_before is kept as the permanent audit record even
               # after the Deal's own field is cleared below.
            deal.status = deal.status_before_dispute or dispute.deal_status_before or DealStatus.FUNDED
        deal.status_before_dispute = None
    deal.dispute_status = None  # badge clears either way — case is resolved

    db.commit()
    db.refresh(dispute)

    outcome_line = {
        "lost": "The payment was refunded to the business.",
        "won": "The deal has resumed as normal.",
        "warning_closed": "The deal has resumed as normal.",
    }[dp.status]
    db.add(DisputeEvent(dispute_id=dispute.id, kind="system",
                        body=f"Dispute closed — outcome: {dp.status}."))
    _notify_parties_and_admins(
        db, deal, dispute,
        party_body=f"The payment dispute on deal #{deal.id} has been resolved. {outcome_line}",
        admin_body=f"Dispute on deal #{deal.id} closed — outcome: {dp.status}.",
        notif_type="dispute_closed",
    )
    db.commit()
    db.refresh(dispute)
    return dispute


def record_dispute_funds_event(db: Session, stripe_dispute_id: str, deal: Deal,
                               kind: str) -> Optional[Dispute]:
    """Handle charge.dispute.funds_withdrawn / funds_reinstated.

    Informational only — payout_already_released was already captured at
    dispute-open time, so this doesn't change deal or dispute status, just logs
    exactly when the money actually moved (useful for reconciliation).
    """
    dispute = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if dispute is None:
        dispute = open_dispute_from_event(db, stripe_dispute_id, deal)
        if dispute is None:
            return None
    now = datetime.utcnow()
    if kind == "withdrawn":
        dispute.funds_withdrawn_at = now
        body = "Funds withdrawn from PromoSlot's Stripe balance."
    else:
        dispute.funds_reinstated_at = now
        body = "Funds reinstated to PromoSlot's Stripe balance."
    db.add(DisputeEvent(dispute_id=dispute.id, kind="system", body=body))
    db.commit()
    db.refresh(dispute)
    return dispute
