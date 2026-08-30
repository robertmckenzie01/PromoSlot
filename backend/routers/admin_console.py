"""The unified admin console (task #32) — one screen with everything across
the platform that currently needs a human decision, instead of an admin
separately visiting /verification/queue, /disputes, /review/queue,
/review/payouts, /admin/ledger, and the affiliate settlement list one at a
time with no combined view of how much is actually waiting.

This router adds nothing new underneath — every count here is a real query
against the same tables each of those dedicated screens already reads
(AccountVerificationRequest, Dispute, Deal, AffiliateProgram, LedgerEntry).
It's a landing/overview layer, not a replacement for any of them: each
figure below is meant to be a link out to the real queue that has the
detail, oldest-first ordering, and the actual decision actions.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import ledger
from ..db import get_db
from ..deps import RequirePerm
from ..models import AccountVerificationRequest, AffiliateProgram, Deal, DealStatus, Dispute, User
from ..money import deal_money_for
from ..permissions import Perm

router = APIRouter(prefix="/admin/console", tags=["admin"])


def _oldest(rows, attr: str) -> Optional[str]:
    if not rows:
        return None
    return min(getattr(r, attr) for r in rows).isoformat()


@router.get("")
def admin_overview(reviewer: User = Depends(RequirePerm(Perm.DEAL_VIEW_EVIDENCE)),
                   db: Session = Depends(get_db)):
    pending_avr = db.query(AccountVerificationRequest).filter_by(status="pending").all()

    open_disputes = db.query(Dispute).filter(Dispute.closed_at.is_(None)).all()
    open_disputes_amount = sum(d.amount for d in open_disputes)

    review_queue = (db.query(Deal)
                   .filter(Deal.funded_at.isnot(None), Deal.verified_at.is_(None),
                           Deal.status.in_([DealStatus.PROOF_SUBMITTED, DealStatus.UNDER_REVIEW]))
                   .all())

    payout_queue = (db.query(Deal)
                    .filter(Deal.verified_at.isnot(None), Deal.paid_at.is_(None),
                            Deal.status == DealStatus.VERIFIED)
                    .all())

    programs_awaiting_settlement = db.query(AffiliateProgram).filter_by(status="ended").all()

    return {
        "pending_verifications": {
            "count": len(pending_avr),
            "oldest_submitted_at": _oldest(pending_avr, "created_at"),
        },
        "open_disputes": {
            "count": len(open_disputes),
            "total_disputed_amount": open_disputes_amount,
            "oldest_opened_at": _oldest(open_disputes, "opened_at"),
        },
        "review_queue": {
            "count": len(review_queue),
        },
        "payout_queue": {
            "count": len(payout_queue),
            "total_net_owed": sum(deal_money_for(d)["net_to_owner"] for d in payout_queue),
        },
        "affiliate_settlements_due": {
            "count": len(programs_awaiting_settlement),
        },
        "ledger": {
            "absorbed_loss_total": ledger.absorbed_loss_total(db),
            **{k: v for k, v in ledger.summary(db).items() if k in ("total_in", "total_out", "net")},
        },
    }
