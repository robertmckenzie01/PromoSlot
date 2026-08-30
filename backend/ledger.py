"""The platform-wide money-movement ledger (task #31).

record() is called from inside the same functions in services.py that
already create/update a Payment/Transfer/Dispute row or flip a Deal/
AffiliateProgram's status on a REAL, confirmed Stripe event — never
speculatively, never before the underlying Stripe call has actually
succeeded. It does not call db.commit() itself (same convention as the
Notification() rows added right alongside it throughout services.py) — it
composes into whatever transaction the caller is already in.

summary()/absorbed_loss_total()/reconcile() are the read side: a running
balance and per-kind breakdown for the admin ledger view, the total of
lost-dispute losses PromoSlot has actually absorbed (money paid out to an
owner that a later chargeback then also reversed), and a diagnostic diff
against Stripe's own Transfer/Refund history to catch drift no other part
of this codebase checks for (see services.py's handle_payout_event
docstring, which explicitly named this as deferred to Phase 2 — this file
is that deferred work).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from .models import Dispute, LedgerEntry, LedgerKind
from .stripe_client import stripe


def record(db: Session, *, kind: str, amount: int, currency: str = "gbp",
          deal_id: Optional[int] = None, affiliate_program_id: Optional[int] = None,
          stripe_ref: Optional[str] = None, note: Optional[str] = None) -> LedgerEntry:
    """Insert one ledger row. amount is signed pence — positive for money
    into the platform's Stripe balance, negative for money out. See
    LedgerEntry's docstring in models.py for the full sign convention."""
    entry = LedgerEntry(kind=kind, amount=amount, currency=currency, deal_id=deal_id,
                        affiliate_program_id=affiliate_program_id, stripe_ref=stripe_ref, note=note)
    db.add(entry)
    return entry


def summary(db: Session, *, since: Optional[datetime] = None,
           until: Optional[datetime] = None) -> dict:
    """Aggregate view over a window (or all time if unbounded): total in,
    total out, net, and a per-kind breakdown — the numbers the admin ledger
    view's header figures come from."""
    q = db.query(LedgerEntry)
    if since is not None:
        q = q.filter(LedgerEntry.created_at >= since)
    if until is not None:
        q = q.filter(LedgerEntry.created_at < until)
    rows = q.all()
    total_in = sum(r.amount for r in rows if r.amount > 0)
    total_out = sum(-r.amount for r in rows if r.amount < 0)
    by_kind: dict = {}
    for r in rows:
        by_kind[r.kind] = by_kind.get(r.kind, 0) + r.amount
    return {"total_in": total_in, "total_out": total_out, "net": total_in - total_out,
            "by_kind": by_kind, "count": len(rows)}


def absorbed_loss_total(db: Session) -> int:
    """Total pence PromoSlot has actually absorbed from lost disputes where
    the platform owner had already been paid before the chargeback landed —
    a Transfer that already happened for real, followed by Stripe reversing
    the underlying charge, with no automatic clawback from the owner (see
    Dispute.payout_already_released's docstring in models.py, and
    close_dispute_from_event's "absorbed loss" comments in services.py).

    Joined on stripe_dispute_id == LedgerEntry.stripe_ref rather than
    deal_id, so a deal that somehow saw more than one dispute over its life
    is still counted precisely per-dispute rather than by deal. Returns a
    plain positive magnitude (not a signed ledger amount).
    """
    rows = (db.query(LedgerEntry)
           .join(Dispute, Dispute.stripe_dispute_id == LedgerEntry.stripe_ref)
           .filter(LedgerEntry.kind == LedgerKind.DISPUTE_LOST,
                   Dispute.payout_already_released.is_(True))
           .all())
    return sum(-r.amount for r in rows)


def reconcile(db: Session, *, since: datetime, until: Optional[datetime] = None) -> dict:
    """Diagnostic diff between what this platform's ledger thinks it moved
    and what Stripe's own Transfer/Refund history for the window actually
    shows. Reports drift; never auto-fixes anything — same "flag it for a
    human" posture as every other reconciliation point already in the
    codebase (mark_deal_funded_from_pi, confirm_refund_from_charge,
    close_dispute_from_event's defensive branch all leave state untouched
    and log rather than guess).

    Only checks Transfers and Refunds — the two Stripe object types this
    platform actually initiates money-moving calls for. PaymentIntents are
    already covered by a stronger, per-object check at the moment they're
    confirmed (mark_deal_funded_from_pi/mark_affiliate_program_funded_from_pi/
    mark_affiliate_topup_funded_from_pi re-retrieve and verify each one
    individually before ever trusting it) — a batch list-and-diff here would
    only repeat that, not add anything a real drift wouldn't already have
    been caught by.

    A real Stripe call — requires network access and a configured
    STRIPE_SECRET_KEY. Callers should expect this to be slow-ish (paginated
    Stripe list calls) and use it as an on-demand admin action, not
    something run on every page load.
    """
    until = until or datetime.utcnow()
    created_gte = int(since.timestamp())
    created_lt = int(until.timestamp())

    known_transfer_refs = {row[0] for row in db.query(LedgerEntry.stripe_ref).filter(
        LedgerEntry.kind.in_([LedgerKind.DEAL_PAYOUT, LedgerKind.AFFILIATE_PAYOUT]),
        LedgerEntry.stripe_ref.isnot(None)).all()}
    known_refund_refs = {row[0] for row in db.query(LedgerEntry.stripe_ref).filter(
        LedgerEntry.kind.in_([LedgerKind.DEAL_REFUND, LedgerKind.AFFILIATE_REFUND]),
        LedgerEntry.stripe_ref.isnot(None)).all()}

    missing_transfers = []
    for tr in stripe.Transfer.list(created={"gte": created_gte, "lt": created_lt}, limit=100).auto_paging_iter():
        if tr.id not in known_transfer_refs:
            missing_transfers.append({
                "id": tr.id, "amount": tr.amount, "currency": tr.currency,
                "destination": getattr(tr, "destination", None),
                "created": datetime.utcfromtimestamp(tr.created).isoformat(),
            })

    missing_refunds = []
    for rf in stripe.Refund.list(created={"gte": created_gte, "lt": created_lt}, limit=100).auto_paging_iter():
        if rf.id not in known_refund_refs:
            missing_refunds.append({
                "id": rf.id, "amount": rf.amount, "currency": rf.currency,
                "created": datetime.utcfromtimestamp(rf.created).isoformat(),
            })

    return {
        "since": since.isoformat(), "until": until.isoformat(),
        "missing_transfers": missing_transfers, "missing_refunds": missing_refunds,
        "clean": not missing_transfers and not missing_refunds,
    }
