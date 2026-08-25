"""Delivery review and payout — permission-gated, state-machine controlled.

Verification is a deliberate human action by a PromoSlot admin looking at real
submitted evidence. It is never triggered by time passing, a step being reached,
or a deal party clicking through their own flow.

`deal.verify` and `payout.release` are deliberately separate permissions, so a
finance-only role can be introduced later without redesigning this.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import audit
from ..config import settings
from ..db import get_db
from ..deps import RequirePerm, get_current_user
from ..deal_state import assert_not_final, assert_payout_eligible, assert_transition
from ..mailer import proof_grace_period_email, send_email
from ..models import ConnectedAccount, Deal, DealStatus, Proof, User, Verification
from ..permissions import Perm, is_super_admin
from ..services import (create_deal_payout, deal_money_for, onboarding_complete,
                        open_proof_grace_period, pool_settlement_for, refund_deal,
                        settle_pool_deal, sync_connected_account, try_instant_payout,
                        verify_delivery)
from ..stripe_client import client

router = APIRouter(prefix="/review", tags=["review"])

_INCLUDE = ["configuration.recipient", "requirements", "identity"]


def _assert_no_open_dispute(d: Deal) -> None:
    """Block verify/release/refund while a chargeback is open on this deal.

    deal_state.py's ALLOWED_TRANSITIONS technically permits DISPUTED -> VERIFIED
    /PAID/REFUNDED (that path exists for services.close_dispute_from_event,
    which drives it automatically from the real Stripe outcome) — but nothing
    here should move the deal by hand while a dispute is genuinely still open.
    Only Deal.dispute_status (cleared the moment the dispute closes) gates this,
    so a resolved dispute never blocks normal review again.
    """
    if d.dispute_status is not None:
        raise HTTPException(
            status_code=409,
            detail="This deal has an open payment dispute — it resolves automatically "
                   "once Stripe closes the case, see the Disputes queue.")


class VerifyIn(BaseModel):
    decision: str                                    # "approved" | "rejected" | "changes_requested"
    notes: Optional[str] = None
    reason: str = Field(min_length=3, max_length=1000)
    evidence_reviewed: bool = False                  # explicit confirmation
    # Required on approval for a per_view/per_impression (or hybrid = same
    # model + listed_price>0) deal — the actual quantity a reviewer confirms,
    # independently of what the platform owner submitted. The later pool
    # settlement step reads this rather than having an admin re-derive it.
    # Meaningless for a plain fixed deal, so left optional here and only
    # enforced below for the pricing models that need it.
    verified_quantity: Optional[int] = Field(default=None, ge=0)
    # Opt-in, only meaningful alongside decision="changes_requested" on a
    # per_view/per_impression deal — see services.open_proof_grace_period.
    # A reviewer requesting changes for an ordinary reason (blurry screenshot,
    # wrong link, etc.) leaves this false; it's specifically for "I suspect
    # this undersells actual delivery, give the owner a fixed window to add
    # more before I finalize using only what's here."
    open_grace_period: bool = False


class ReleaseIn(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    evidence_reviewed: bool = False


def _deal_or_404(db: Session, deal_id: int) -> Deal:
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return d


def _assert_not_party(actor: User, d: Deal) -> None:
    """Conflict of interest: never review or pay out your own deal."""
    if actor.id in (d.business_id, d.platform_owner_id):
        raise HTTPException(
            status_code=403,
            detail="Conflict of interest: you are a party to this deal.")


def _deal_snapshot(d: Deal) -> dict:
    return {"status": d.status, "listed_price": d.listed_price,
            "verified": d.verified_at is not None, "paid": d.paid_at is not None}


@router.get("/queue")
def review_queue(reviewer: User = Depends(RequirePerm(Perm.DEAL_VIEW_EVIDENCE)),
                 db: Session = Depends(get_db)):
    """Funded deals with evidence submitted, awaiting a verification decision."""
    rows = (db.query(Deal)
            .filter(Deal.funded_at.isnot(None), Deal.verified_at.is_(None),
                    Deal.status.in_([DealStatus.PROOF_SUBMITTED, DealStatus.UNDER_REVIEW]))
            .order_by(Deal.id.asc()).all())
    return [{"deal_id": d.id, "business_id": d.business_id,
             "platform_owner_id": d.platform_owner_id,
             "listed_price": d.listed_price, "status": d.status,
             "is_party": reviewer.id in (d.business_id, d.platform_owner_id),
             "proof_count": db.query(Proof).filter_by(deal_id=d.id).count()} for d in rows]


@router.get("/payouts")
def payout_queue(reviewer: User = Depends(RequirePerm(Perm.DEAL_VIEW_EVIDENCE)),
                 db: Session = Depends(get_db)):
    """Verified deals not yet paid out — eligible for payout."""
    rows = (db.query(Deal)
            .filter(Deal.verified_at.isnot(None), Deal.paid_at.is_(None),
                    Deal.status == DealStatus.VERIFIED)
            .order_by(Deal.verified_at.asc()).all())
    out = []
    for d in rows:
        owner = db.get(User, d.platform_owner_id)
        ca = db.query(ConnectedAccount).filter_by(user_id=d.platform_owner_id).first()
        m = deal_money_for(d)
        needs_super = m["net_to_owner"] > settings.payout_admin_limit_pence
        out.append({
            "deal_id": d.id,
            "owner": owner.display_name if owner else "",
            "listed_price": d.listed_price,
            "net_to_owner": m["net_to_owner"],
            "status": d.status,
            "payout_ready": bool(ca and ca.transfers_active),
            "requires_super_admin": needs_super,
            "is_party": reviewer.id in (d.business_id, d.platform_owner_id),
        })
    return out


@router.get("/completed")
def completed_deals(reviewer: User = Depends(RequirePerm(Perm.DEAL_VIEW_EVIDENCE)),
                    db: Session = Depends(get_db)):
    """Historical completed (paid-out) deals — admin record-keeping."""
    rows = (db.query(Deal).filter(Deal.paid_at.isnot(None))
            .order_by(Deal.paid_at.desc()).all())
    out = []
    for d in rows:
        biz = db.get(User, d.business_id)
        owner = db.get(User, d.platform_owner_id)
        m = deal_money_for(d)
        out.append({
            "deal_id": d.id,
            "business": (biz.display_name or biz.email) if biz else "",
            "owner": (owner.display_name or owner.email) if owner else "",
            "listed_price": d.listed_price,
            "total_charged": m["charge_amount"],
            "net_to_owner": m["net_to_owner"],
            "platform_take": m["platform_take"],
            "transfer_id": d.transfer_id,
            "paid_at": d.paid_at.isoformat() if d.paid_at else None,
        })
    return out


@router.post("/deals/{deal_id}/verify")
def verify(deal_id: int, body: VerifyIn, request: Request, background: BackgroundTasks,
           reviewer: User = Depends(RequirePerm(Perm.DEAL_VERIFY)),
           db: Session = Depends(get_db)):
    """Record a verification decision. Never moves money."""
    if body.decision not in ("approved", "rejected", "changes_requested"):
        raise HTTPException(status_code=422,
                            detail="decision must be 'approved', 'rejected' or 'changes_requested'")
    if body.decision in ("rejected", "changes_requested"):
        # Rejecting is a distinct permission from approving.
        from ..permissions import require_permission
        require_permission(reviewer, Perm.DEAL_REJECT)
    if not body.evidence_reviewed:
        raise HTTPException(status_code=422,
                            detail="You must confirm you reviewed the delivery evidence.")
    if body.open_grace_period and body.decision != "changes_requested":
        raise HTTPException(
            status_code=422,
            detail="open_grace_period only applies to a 'changes_requested' decision")

    d = _deal_or_404(db, deal_id)
    _assert_not_party(reviewer, d)
    assert_not_final(d)
    _assert_no_open_dispute(d)
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded")
    if d.verified_at is not None:
        raise HTTPException(status_code=409, detail="Deal already verified")
    if body.open_grace_period and d.pricing_model not in ("per_view", "per_impression"):
        raise HTTPException(
            status_code=409,
            detail="The proof-update grace period only applies to per_view/per_impression deals")
    # The one exception to "changes_requested must go through a resubmission
    # before it can be approved": once an open grace period's deadline has
    # actually passed, the reviewer can approve straight from CHANGES_REQUESTED
    # using whatever was already submitted (see deal_state.py comment). While
    # the deadline is still in the future, settling for less friction here
    # would defeat the entire point of having offered the window.
    if (body.decision == "approved" and d.status == DealStatus.CHANGES_REQUESTED
            and d.proof_grace_deadline is not None and d.proof_grace_deadline > datetime.utcnow()):
        raise HTTPException(
            status_code=409,
            detail=f"Open proof-update grace period until {d.proof_grace_deadline.isoformat()} "
                   "— wait for it to close, or for the owner to resubmit, before approving.")

    real_proofs = db.query(Proof).filter(
        Proof.deal_id == d.id,
        (Proof.stored_path.isnot(None)) | (Proof.url.isnot(None)),
    ).count()
    if real_proofs == 0:
        raise HTTPException(status_code=409, detail="No submitted evidence to verify")

    # A per_view/per_impression pool (or a hybrid deal on the same model with
    # listed_price also >0) can't be settled without a confirmed quantity —
    # the payout calculation has nothing to work from otherwise. Only
    # enforced on approval; a reviewer requesting changes or rejecting isn't
    # claiming a number yet.
    if (body.decision == "approved"
            and d.pricing_model in ("per_view", "per_impression")
            and body.verified_quantity is None):
        raise HTTPException(
            status_code=422,
            detail="verified_quantity is required to approve a per_view/per_impression deal")

    target = {"approved": DealStatus.VERIFIED,
              "rejected": DealStatus.REJECTED,
              "changes_requested": DealStatus.CHANGES_REQUESTED}[body.decision]
    assert_transition(d.status, target)

    before = _deal_snapshot(d)
    if body.decision == "approved":
        verify_delivery(db, d, reviewer, "approved", body.notes,
                        verified_quantity=body.verified_quantity)
    else:
        verify_delivery(db, d, reviewer, "rejected", body.notes)
        d.status = target                 # rejected vs changes_requested
        db.commit()
        db.refresh(d)

    grace_deadline = None
    if body.open_grace_period:
        grace_deadline = open_proof_grace_period(db, d, reviewer, note=body.notes or "")
        owner = db.get(User, d.platform_owner_id)
        if owner and owner.email:
            subject, html, text = proof_grace_period_email(
                d.id, grace_deadline.isoformat(), body.notes or "")
            # The copy invites a reply ("reply to this email or contact
            # support") — MAIL_FROM is a no-reply sender, so Reply-To has to
            # actually point at support or that promise is empty.
            background.add_task(send_email, owner.email, subject, html, text,
                                reply_to=settings.support_email)
        audit.record(db, actor=reviewer, action="deal.grace_period_opened",
                     target_type="deal", target_id=d.id, previous_state=before,
                     new_state=_deal_snapshot(d), reason=body.reason, request=request)

    audit.record(db, actor=reviewer,
                 action=f"deal.{'verify' if body.decision == 'approved' else 'reject'}",
                 target_type="deal", target_id=d.id, previous_state=before,
                 new_state=_deal_snapshot(d), reason=body.reason, request=request)
    return {"deal_id": d.id, "status": d.status,
            "verified": d.verified_at is not None, "decision": body.decision,
            "proof_grace_deadline": grace_deadline.isoformat() if grace_deadline else None}


def _ready_connected_account(db: Session, deal: Deal) -> ConnectedAccount:
    """Shared by every payout path (plain release, pool settlement) so the two
    can never drift apart on what "ready to be paid" means.
    """
    ca = db.query(ConnectedAccount).filter_by(user_id=deal.platform_owner_id).first()
    if ca is None:
        raise HTTPException(status_code=409, detail="Platform owner has not connected a payout account")
    try:
        acct = client.v2.core.accounts.retrieve(ca.stripe_account_id, {"include": _INCLUDE})
        ca = sync_connected_account(db, acct) or ca
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error checking payout account: {e}")
    if not onboarding_complete(ca):
        raise HTTPException(status_code=409,
                            detail="Platform owner's payouts are not enabled yet (onboarding incomplete)")
    return ca


def _assert_within_admin_limit(reviewer: User, net_to_owner: int) -> None:
    if net_to_owner > settings.payout_admin_limit_pence and not is_super_admin(reviewer):
        raise HTTPException(
            status_code=403,
            detail=(f"Payouts above £{settings.payout_admin_limit_pence/100:,.2f} "
                    "require Super-Admin approval."))


@router.post("/deals/{deal_id}/release")
def release_payout(deal_id: int, body: ReleaseIn, request: Request,
                   reviewer: User = Depends(RequirePerm(Perm.PAYOUT_RELEASE)),
                   db: Session = Depends(get_db)):
    """Release funds held pending verification to the platform owner via a real
    Stripe Transfer.

    Gated on: verified state, not already paid, payouts enabled on the owner's
    connected account (checked live), the admin is not a party to the deal, and
    — above the configured threshold — Super-Admin authority. The payout amount
    is derived from the deal's locked terms; it can never be edited here.

    Fixed-price deals only — a per_view/per_impression (or hybrid) deal
    settles through /settle-pool below instead, since it can involve a
    partial refund alongside the payout, which this endpoint doesn't do.
    """
    if not body.evidence_reviewed:
        raise HTTPException(status_code=422,
                            detail="You must confirm you reviewed the delivery evidence.")
    d = _deal_or_404(db, deal_id)
    _assert_not_party(reviewer, d)
    _assert_no_open_dispute(d)
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded")
    if d.pricing_model in ("per_view", "per_impression"):
        raise HTTPException(status_code=409,
                            detail="This deal has a pool — settle it via /settle-pool instead")
    assert_payout_eligible(d)
    assert_transition(d.status, DealStatus.PAID)

    m = deal_money_for(d)
    _assert_within_admin_limit(reviewer, m["net_to_owner"])
    ca = _ready_connected_account(db, d)

    before = _deal_snapshot(d)
    try:
        tr = create_deal_payout(db, d, ca.stripe_account_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe transfer failed: {e}")

    # Best-effort: if the owner opted in to always-instant, try converting this
    # payout to a real Instant Payout on top of the Transfer above. Never lets
    # an instant-payout failure affect the (already-succeeded) main release —
    # a failed/ineligible attempt just leaves the deal on the standard
    # scheduled payout, exactly as if opt-in were off.
    if ca.instant_payout_opt_in:
        try:
            try_instant_payout(db, d, ca)
        except Exception:
            pass

    audit.record(db, actor=reviewer, action="payout.release", target_type="deal",
                 target_id=d.id, previous_state=before, new_state=_deal_snapshot(d),
                 reason=body.reason, request=request)
    return {
        "deal_id": d.id, "status": d.status, "paid": d.paid_at is not None,
        "transfer_id": tr.id,
        "listed_price": m["listed_price"], "seller_fee_percent": d.seller_fee_percent,
        "seller_fee": m["seller_fee"], "net_to_owner": m["net_to_owner"],
        "buyer_fee": m["buyer_fee"], "platform_take": m["platform_take"],
    }


@router.post("/deals/{deal_id}/refund")
def refund(deal_id: int, body: ReleaseIn, request: Request,
           reviewer: User = Depends(RequirePerm(Perm.DEAL_REJECT)),
           db: Session = Depends(get_db)):
    """Refund the business (delivery not verified). Real Stripe Refund."""
    d = _deal_or_404(db, deal_id)
    _assert_not_party(reviewer, d)
    _assert_no_open_dispute(d)
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded — nothing to refund")
    if d.paid_at is not None:
        raise HTTPException(status_code=409, detail="Deal already paid out — cannot refund")
    if d.status == DealStatus.REFUNDED:
        raise HTTPException(status_code=409, detail="Deal already refunded")
    assert_transition(d.status, DealStatus.REFUNDED)

    before = _deal_snapshot(d)
    try:
        rf = refund_deal(db, d)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe refund failed: {e}")
    audit.record(db, actor=reviewer, action="deal.refund", target_type="deal",
                 target_id=d.id, previous_state=before, new_state=_deal_snapshot(d),
                 reason=body.reason, request=request)
    return {"deal_id": d.id, "status": d.status, "refund_id": rf.id}


@router.post("/deals/{deal_id}/settle-pool")
def settle_pool(deal_id: int, body: ReleaseIn, request: Request,
                reviewer: User = Depends(RequirePerm(Perm.PAYOUT_RELEASE)),
                db: Session = Depends(get_db)):
    """Settle a per_view/per_impression (or hybrid) deal: one combined Transfer
    to the platform owner (fixed portion, if any, + released pool slice) plus
    one partial Refund of the unused pool balance to the business, if any is
    left. There is exactly one settlement event per pool deal — no incremental/
    repeated releases — so this can only ever be called once per deal
    (paid_at gates it, same as the plain /release endpoint).

    Gated the same way /release is (verified, not paid, payout-ready account,
    not a party, no open dispute, admin-limit check on the total payout),
    plus: must actually be a pool deal, must not still be inside an open
    proof-update grace period, and must have a verified_quantity on record
    from the approval decision (verify() already requires this to approve a
    pool deal, so its absence here would mean something upstream is broken,
    not a normal user-facing case).
    """
    if not body.evidence_reviewed:
        raise HTTPException(status_code=422,
                            detail="You must confirm you reviewed the delivery evidence.")
    d = _deal_or_404(db, deal_id)
    _assert_not_party(reviewer, d)
    _assert_no_open_dispute(d)
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal is not funded")
    if d.pricing_model not in ("per_view", "per_impression"):
        raise HTTPException(status_code=409,
                            detail="This deal has no pool — use /release instead")
    if d.proof_grace_deadline is not None and d.proof_grace_deadline > datetime.utcnow():
        raise HTTPException(
            status_code=409,
            detail=f"Open proof-update grace period until {d.proof_grace_deadline.isoformat()} "
                   "— settlement can't finalize yet.")
    assert_payout_eligible(d)
    assert_transition(d.status, DealStatus.PAID)

    verification = (db.query(Verification)
                    .filter_by(deal_id=d.id, decision="approved")
                    .order_by(Verification.id.desc()).first())
    if verification is None or verification.verified_quantity is None:
        raise HTTPException(status_code=409,
                            detail="No verified_quantity on record for this deal — cannot settle")

    fixed = deal_money_for(d)
    pool = pool_settlement_for(d, verification.verified_quantity)
    _assert_within_admin_limit(reviewer, fixed["net_to_owner"] + pool["pool_net_to_owner"])
    ca = _ready_connected_account(db, d)

    before = _deal_snapshot(d)
    try:
        result = settle_pool_deal(db, d, ca.stripe_account_id, verification.verified_quantity)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe settlement failed: {e}")

    if ca.instant_payout_opt_in:
        try:
            try_instant_payout(db, d, ca)
        except Exception:
            pass

    audit.record(db, actor=reviewer, action="payout.settle_pool", target_type="deal",
                 target_id=d.id, previous_state=before, new_state=_deal_snapshot(d),
                 reason=body.reason, request=request)
    return {
        "deal_id": d.id, "status": d.status, "paid": d.paid_at is not None,
        "transfer_id": result["transfer"].id,
        "refund_id": result["refund"].id if result["refund"] else None,
        "verified_quantity": verification.verified_quantity,
        "units": pool["units"], "pool_gross": pool["pool_gross"],
        "pool_net_to_owner": pool["pool_net_to_owner"],
        "pool_platform_take": pool["pool_platform_take"],
        "refund_to_business": pool["refund_to_business"],
        "fixed_net_to_owner": fixed["net_to_owner"],
        "total_net_to_owner": result["total_net_to_owner"],
    }
