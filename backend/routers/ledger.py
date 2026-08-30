"""The platform-wide money-movement ledger — admin-only visibility (task #31).

Every existing money view in this codebase is scoped to one deal, one
dispute, or one affiliate program (see routers/deals.py's deal_dict(),
routers/disputes.py, routers/affiliate.py's admin endpoints) — there was no
single place to see every real money movement across the whole platform in
order, with a running total. This router is that place: a thin read layer
over backend/ledger.py's LedgerEntry rows (written by backend/services.py at
the exact moment each real Stripe event is confirmed — see backend/
ledger.py's module docstring for why nothing here ever writes anything).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import ledger
from ..db import get_db
from ..deps import RequirePerm
from ..models import LedgerEntry, User
from ..permissions import Perm

router = APIRouter(prefix="/admin/ledger", tags=["admin"])

MAX_LIMIT = 500


def _entry_dict(e: LedgerEntry) -> dict:
    return {
        "id": e.id, "kind": e.kind, "amount": e.amount, "currency": e.currency,
        "deal_id": e.deal_id, "affiliate_program_id": e.affiliate_program_id,
        "stripe_ref": e.stripe_ref, "note": e.note,
        "created_at": e.created_at.isoformat(),
    }


@router.get("")
def list_ledger(
    since: Optional[datetime] = None,
    until: Optional[datetime] = None,
    kind: Optional[str] = None,
    deal_id: Optional[int] = None,
    affiliate_program_id: Optional[int] = None,
    limit: int = Query(default=100, le=MAX_LIMIT),
    offset: int = 0,
    reviewer: User = Depends(RequirePerm(Perm.PAYOUT_RELEASE)),
    db: Session = Depends(get_db),
):
    """Chronological (newest-first) money-movement feed, plus a summary
    (total in/out/net and a per-kind breakdown) computed over the SAME
    filters — so the header figures always match what's actually listed
    below them, never a silently different unfiltered total.
    """
    q = db.query(LedgerEntry)
    if since is not None:
        q = q.filter(LedgerEntry.created_at >= since)
    if until is not None:
        q = q.filter(LedgerEntry.created_at < until)
    if kind is not None:
        q = q.filter(LedgerEntry.kind == kind)
    if deal_id is not None:
        q = q.filter(LedgerEntry.deal_id == deal_id)
    if affiliate_program_id is not None:
        q = q.filter(LedgerEntry.affiliate_program_id == affiliate_program_id)

    total_count = q.count()
    rows = q.order_by(LedgerEntry.created_at.desc(), LedgerEntry.id.desc()).offset(offset).limit(limit).all()

    return {
        "entries": [_entry_dict(e) for e in rows],
        "total_count": total_count,
        "summary": ledger.summary(db, since=since, until=until),
        "absorbed_loss_total": ledger.absorbed_loss_total(db),
    }


@router.get("/reconcile")
def reconcile_ledger(
    since: datetime,
    until: Optional[datetime] = None,
    reviewer: User = Depends(RequirePerm(Perm.PAYOUT_RELEASE)),
    db: Session = Depends(get_db),
):
    """On-demand diff against Stripe's real Transfer/Refund history for a
    window — diagnostic only, never auto-fixes anything (see backend/
    ledger.py's reconcile() docstring). A real Stripe call: expect this to
    take a few seconds on a wide date range, not something to poll.
    """
    try:
        return ledger.reconcile(db, since=since, until=until)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error during reconciliation: {e}")
