"""Backend-controlled deal state machine.

The review/payout lifecycle is:

    proof_submitted (Submitted)
      -> under_review
      -> changes_requested | rejected | verified   (verified == eligible for payout)
      -> paid                                       (payout released)

Only these transitions are legal. Calling an API directly cannot, for example,
move a rejected deal straight to paid: every state change goes through
assert_transition(), which is enforced server-side regardless of the caller.
"""
from fastapi import HTTPException

from .models import DealStatus

# current -> set of states it may legally move to
ALLOWED_TRANSITIONS = {
    DealStatus.DRAFT: {DealStatus.AWAITING_APPROVAL, DealStatus.CANCELLED},
    DealStatus.AWAITING_APPROVAL: {DealStatus.APPROVED, DealStatus.CANCELLED},
    DealStatus.APPROVED: {DealStatus.AWAITING_FUNDING, DealStatus.FUNDED, DealStatus.CANCELLED},
    DealStatus.AWAITING_FUNDING: {DealStatus.FUNDED, DealStatus.CANCELLED},
    DealStatus.FUNDED: {DealStatus.IN_DELIVERY, DealStatus.PROOF_SUBMITTED,
                        DealStatus.REFUNDED, DealStatus.DISPUTED},
    DealStatus.IN_DELIVERY: {DealStatus.PROOF_SUBMITTED, DealStatus.REFUNDED,
                             DealStatus.DISPUTED},
    DealStatus.PROOF_SUBMITTED: {DealStatus.UNDER_REVIEW, DealStatus.VERIFIED,
                                 DealStatus.CHANGES_REQUESTED, DealStatus.REJECTED,
                                 DealStatus.REFUNDED, DealStatus.DISPUTED},
    DealStatus.UNDER_REVIEW: {DealStatus.VERIFIED, DealStatus.CHANGES_REQUESTED,
                              DealStatus.REJECTED, DealStatus.REFUNDED,
                              DealStatus.DISPUTED},
    # Owner can resubmit after changes were requested. VERIFIED is also
    # reachable directly (without a resubmission) — a reviewer may simply
    # reconsider, and it's the only way out of an open proof-update grace
    # period (Deal.proof_grace_deadline) once it closes with no new proof:
    # the reviewer approves using what was already submitted. routers/review.py
    # additionally blocks this specific transition while a grace deadline is
    # still in the future — this table only says the path can legally exist.
    DealStatus.CHANGES_REQUESTED: {DealStatus.PROOF_SUBMITTED, DealStatus.VERIFIED,
                                   DealStatus.REFUNDED, DealStatus.DISPUTED,
                                   DealStatus.CANCELLED},
    # A rejected deal can only be refunded or disputed — never paid.
    DealStatus.REJECTED: {DealStatus.REFUNDED, DealStatus.DISPUTED},
    # Verified == eligible for payout. Payout or refund; never back to review.
    DealStatus.VERIFIED: {DealStatus.PAID, DealStatus.REFUNDED, DealStatus.DISPUTED},
    DealStatus.DISPUTED: {DealStatus.REFUNDED, DealStatus.VERIFIED, DealStatus.PAID},
    # Terminal
    DealStatus.PAID: set(),
    DealStatus.REFUNDED: set(),
    DealStatus.CANCELLED: set(),
}

# States whose money/verification outcome is settled — the record must not be
# edited afterwards (no re-verifying, no changing amounts).
FINAL_STATES = {DealStatus.PAID, DealStatus.REFUNDED, DealStatus.CANCELLED}


def can_transition(current: str, nxt: str) -> bool:
    return nxt in ALLOWED_TRANSITIONS.get(current, set())


def assert_transition(current: str, nxt: str) -> None:
    if not can_transition(current, nxt):
        raise HTTPException(
            status_code=409,
            detail=f"Invalid deal state transition: {current} -> {nxt}",
        )


def assert_not_final(deal) -> None:
    """Block edits to a deal whose outcome is already settled."""
    if deal.status in FINAL_STATES:
        raise HTTPException(status_code=409,
                            detail=f"Deal is {deal.status} and can no longer be modified")


def assert_payout_eligible(deal) -> None:
    """Payout is only ever possible from the verified (eligible) state."""
    if deal.paid_at is not None:
        raise HTTPException(status_code=409, detail="Deal already paid out")
    if deal.verified_at is None or deal.status != DealStatus.VERIFIED:
        raise HTTPException(status_code=409,
                            detail="Deal is not eligible for payout (must be verified first)")
