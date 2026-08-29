"""Account-level verification — business identity, platform identity, and
platform-ownership evidence. Distinct from routers/review.py, which is deal
DELIVERY evidence; this is about who someone IS, not what they delivered.

Three request shapes, one queue:
  business_identity   -> a Business's own Stripe v2 "merchant" account
                          (identity/KYB only, never used to accept a charge).
  platform_identity   -> a platform owner's EXISTING Stripe v2 "recipient"
                          account (the one they already set up for payouts,
                          see routers/connect.py) — reused here, no separate
                          Stripe account for platform owners.
  platform_ownership  -> a platform owner's own evidence that they control
                          the account they've listed (analytics access, a
                          recording of logging in). No Stripe involved.

A human reviewer decision is the ONLY thing that ever grants a badge — a
passing Stripe check on its own proves a real identity exists, not that it's
THIS business/platform, so services.decide_verification always requires the
explicit reviewed_by/reviewed_at gate. See that function's docstring for how
a platform owner's two gates combine.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import RequirePerm, get_current_user
from ..models import AccountVerificationRequest, Business, ConnectedAccount, Platform, User
from ..permissions import Perm
from ..services import (business_capability_status_of, business_requirements_outstanding,
                        decide_verification, platform_owner_verified, stripe_legal_name_of,
                        sync_business_account, transfers_status_of)
from ..storage import presigned_url, save_upload
from ..stripe_client import client

router = APIRouter(prefix="/verification", tags=["verification"])

_INCLUDE = ["configuration.merchant", "requirements", "identity"]
_EVIDENCE_MAX_BYTES = 2 * 1024 * 1024 * 1024  # matches platform media cap
_PLATFORM_GATES_LOCAL = ("platform_identity", "platform_ownership")  # mirrors services._PLATFORM_GATES


class OwnershipSubmitIn(BaseModel):
    evidence_checklist: List[str] = []
    evidence_notes: Optional[str] = None


@router.get("/return")
def onboarding_return():
    """Same reasoning as connect.py's /connect/return — no auth dependency,
    the frontend re-checks real status independently via GET .../status.

    Deliberately `acctverify`, not `verify` — `/?verify=<token>` is already a
    real, live query param for emailed email-verification links (see
    promoslot-app.js's PSBoot), and reusing it here would make this redirect
    get treated as a (garbage) email-verification token on landing.
    """
    return RedirectResponse(url="/?acctverify=return")


@router.get("/refresh")
def onboarding_refresh():
    return RedirectResponse(url="/?acctverify=return")


def _stripe_error(e) -> HTTPException:
    msg = getattr(e, "user_message", None) or str(e)
    return HTTPException(status_code=502, detail=f"Stripe error: {msg}")


def _my_business(db: Session, user: User) -> Optional[Business]:
    return db.query(Business).filter_by(owner_id=user.id).first()


def avr_dict(r: AccountVerificationRequest) -> dict:
    return {
        "id": r.id,
        "subject_type": r.subject_type,
        "business_id": r.business_id,
        "platform_id": r.platform_id,
        "submitted_by": r.submitted_by,
        "stripe_legal_name": r.stripe_legal_name,
        "stripe_verified_at": r.stripe_verified_at,
        "evidence_checklist": r.evidence_checklist or [],
        "evidence_notes": r.evidence_notes,
        # Never the raw storage ref — only ever a short-lived signed URL,
        # generated fresh on read, same pattern as every other private file
        # in the app (see storage.presigned_url).
        "evidence_files": [presigned_url(ref) for ref in (r.evidence_media or [])],
        "status": r.status,
        "rejected_reason": r.rejected_reason,
        "reviewed_by": r.reviewed_by,
        "reviewed_at": r.reviewed_at,
        "created_at": r.created_at,
    }


def _submitter_context(db: Session, r: AccountVerificationRequest) -> dict:
    """What the submitter claims ON PROMOSLOT, next to what Stripe verified —
    Rob, 2026-08-28: 'how does this prove any authority the user has over the
    business? all it gives me is the stripe legal name.' A Stripe pass alone
    only proves a real identity exists somewhere; the reviewer's actual job
    (see decide_verification's docstring) is judging whether THAT identity
    matches THIS PromoSlot account. That's only checkable if both sides are
    visible on the same screen, so this is queue/decision-only context, not
    part of avr_dict (the submitter already knows their own info)."""
    user = db.get(User, r.submitted_by)
    ctx = {
        "submitter_email": user.email if user else None,
        "submitter_name": (user.display_name if user else None) or None,
    }
    if r.subject_type == "business_identity":
        biz = db.get(Business, r.business_id) if r.business_id else None
        ctx["claimed_company"] = biz.company if biz else None
    elif r.subject_type in _PLATFORM_GATES_LOCAL:
        listings = db.query(Platform).filter_by(owner_id=r.submitted_by).all()
        ctx["claimed_platforms"] = [
            {"name": p.name, "handle": p.handle, "platform_type": p.platform_type}
            for p in listings
        ]
    return ctx


# ---------------------------------------------------------------------------
# Business identity — Stripe account + submission
# ---------------------------------------------------------------------------

@router.post("/business/account")
def create_business_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create (or reuse) the business's own v2 account. Requests the
    `card_payments` capability purely to unlock identity/KYB collection —
    see services.py's module note on why. Never used to accept a charge."""
    if not user.is_business:
        raise HTTPException(status_code=403, detail="Only a business account can verify a business")

    biz = _my_business(db, user)
    if biz is None:
        raise HTTPException(status_code=400,
                            detail="Set up your business profile before verifying it")
    if biz.stripe_account_id:
        return {"stripe_account_id": biz.stripe_account_id, "reused": True}

    try:
        acct = client.v2.core.accounts.create({
            "contact_email": user.email,
            "display_name": biz.company,
            "dashboard": "none",   # no Express dashboard — this account never moves money
            "identity": {"country": "GB", "entity_type": "company"},
            "defaults": {
                "currency": "gbp",
                "responsibilities": {"fees_collector": "stripe", "losses_collector": "stripe"},
            },
            "configuration": {
                "merchant": {"capabilities": {"card_payments": {"requested": True}}},
            },
            "include": _INCLUDE,
            "metadata": {"promoslot_business_id": str(biz.id), "promoslot_user_id": str(user.id)},
        })
    except Exception as e:
        raise _stripe_error(e)

    biz.stripe_account_id = acct.id
    db.commit()
    return {"stripe_account_id": acct.id, "reused": False}


@router.post("/business/onboarding-link")
def business_onboarding_link(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    biz = _my_business(db, user)
    if biz is None or not biz.stripe_account_id:
        raise HTTPException(status_code=400, detail="Create the verification account first")
    try:
        link = client.v2.core.account_links.create({
            "account": biz.stripe_account_id,
            "use_case": {
                "type": "account_onboarding",
                "account_onboarding": {
                    "configurations": ["merchant"],
                    "refresh_url": f"{settings.app_base_url}/verification/refresh",
                    "return_url": f"{settings.app_base_url}/verification/return",
                },
            },
        })
    except Exception as e:
        raise _stripe_error(e)
    return {"url": link.url}


@router.get("/business/status")
def business_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    biz = _my_business(db, user)
    if biz is None or not biz.stripe_account_id:
        return {"has_account": False, "stripe_checked": False}
    try:
        acct = client.v2.core.accounts.retrieve(biz.stripe_account_id, {"include": _INCLUDE})
    except Exception as e:
        raise _stripe_error(e)
    result = sync_business_account(db, biz, acct)
    return {"has_account": True, "stripe_checked": True, "verified": biz.verified, **result}


@router.get("/business/my-request")
def my_business_request(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The business's own latest submission, whatever state it's in — lets
    the account UI show 'pending review' / 'rejected: <reason>' / nothing
    without needing admin permissions."""
    biz = _my_business(db, user)
    if biz is None:
        return None
    req = (db.query(AccountVerificationRequest)
          .filter_by(business_id=biz.id, subject_type="business_identity")
          .order_by(AccountVerificationRequest.created_at.desc()).first())
    return avr_dict(req) if req else None


@router.post("/business/submit")
def submit_business_verification(body: OwnershipSubmitIn = OwnershipSubmitIn(),
                                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Queue this business for human review, once Stripe's own check passes.
    Stripe passing is a precondition to submit, not the approval itself —
    see decide_verification for the required human step.

    Optional evidence_checklist/evidence_notes ride along in the SAME call —
    Rob, 2026-08-28: 'I want to remove that feature completely' (adding
    evidence to an already-submitted application) because of the extra
    backend surface it creates (resubmissions, a messier admin queue).
    Evidence only ever attaches at the moment of submission, never after;
    the frontend collects it on the same screen as this button, and any
    file upload (POST .../business/evidence) must happen immediately after
    this call, while the request this creates is still the caller's one
    and only pending business_identity row. Universal, non-sensitive,
    low-friction evidence a marketing hire can put together without going
    through finance/legal ('hey boss, can you send me X') — never required,
    Stripe + admin approval alone still fully verifies a business."""
    biz = _my_business(db, user)
    if biz is None or not biz.stripe_account_id:
        raise HTTPException(status_code=400, detail="Complete Stripe verification first")
    try:
        acct = client.v2.core.accounts.retrieve(biz.stripe_account_id, {"include": _INCLUDE})
    except Exception as e:
        raise _stripe_error(e)
    if business_capability_status_of(acct) != "active":
        raise HTTPException(status_code=400,
                            detail="Stripe hasn't finished verifying this business yet")

    existing = db.query(AccountVerificationRequest).filter_by(
        business_id=biz.id, subject_type="business_identity", status="pending").first()
    if existing:
        return avr_dict(existing)

    req = AccountVerificationRequest(
        subject_type="business_identity", business_id=biz.id, submitted_by=user.id,
        stripe_legal_name=stripe_legal_name_of(acct), stripe_verified_at=datetime.utcnow(),
        evidence_checklist=body.evidence_checklist, evidence_notes=body.evidence_notes)
    db.add(req)
    db.commit()
    db.refresh(req)
    return avr_dict(req)


def _pending_business_request(db: Session, biz: Business) -> AccountVerificationRequest:
    req = db.query(AccountVerificationRequest).filter_by(
        business_id=biz.id, subject_type="business_identity", status="pending").first()
    if req is None:
        raise HTTPException(status_code=400, detail="No pending application to attach evidence to")
    return req


@router.post("/business/evidence")
def upload_business_evidence(file: UploadFile = File(...), user: User = Depends(get_current_user),
                             db: Session = Depends(get_db)):
    """Attach a file to the caller's own pending business_identity
    application — same optional, non-blocking, deleted-on-decision evidence
    as add_business_evidence above."""
    biz = _my_business(db, user)
    if biz is None:
        raise HTTPException(status_code=400, detail="Set up your business profile first")
    req = _pending_business_request(db, biz)
    ref, _size = save_upload(f"verification/business_{biz.id}", file, _EVIDENCE_MAX_BYTES)
    req.evidence_media = (req.evidence_media or []) + [ref]
    db.commit()
    return avr_dict(req)


# ---------------------------------------------------------------------------
# Platform owner — identity (reuses their existing payout account) +
# ownership evidence (separate, no Stripe involved). Both are ACCOUNT-level
# (keyed on the owner's user id, platform_id left null) — a listing is NOT
# required to exist first. See services.platform_owner_verified for the
# dual-gate check and the "why" behind this (Rob, 2026-08-27: verification
# shouldn't require a listing any more than business verification does).
# ---------------------------------------------------------------------------

def _require_platform_owner(user: User) -> None:
    if not user.is_platform_owner:
        raise HTTPException(status_code=403, detail="Only a platform-owner account can verify this")


@router.post("/platform/submit-identity")
def submit_platform_identity(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_platform_owner(user)
    conn = db.query(ConnectedAccount).filter_by(user_id=user.id).first()
    if conn is None:
        raise HTTPException(status_code=400, detail="Connect your payout account first")
    try:
        acct = client.v2.core.accounts.retrieve(
            conn.stripe_account_id, {"include": ["configuration.recipient", "identity"]})
    except Exception as e:
        raise _stripe_error(e)
    if transfers_status_of(acct) != "active":
        raise HTTPException(status_code=400,
                            detail="Finish setting up your payout account with Stripe first")

    existing = db.query(AccountVerificationRequest).filter_by(
        submitted_by=user.id, subject_type="platform_identity", status="pending").first()
    if existing:
        return avr_dict(existing)

    legal_name = (_g_identity(acct))
    req = AccountVerificationRequest(
        subject_type="platform_identity", submitted_by=user.id,
        stripe_legal_name=legal_name, stripe_verified_at=datetime.utcnow())
    db.add(req)
    db.commit()
    db.refresh(req)
    return avr_dict(req)


def _g_identity(acct) -> Optional[str]:
    ind = getattr(acct, "identity", None) or {}
    individual = ind.get("individual") if isinstance(ind, dict) else getattr(ind, "individual", None)
    if not individual:
        return None
    given = individual.get("given_name") if isinstance(individual, dict) else getattr(individual, "given_name", None)
    surname = individual.get("surname") if isinstance(individual, dict) else getattr(individual, "surname", None)
    return " ".join(x for x in (given, surname) if x) or None


@router.post("/platform/submit-ownership")
def submit_platform_ownership(body: OwnershipSubmitIn,
                              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_platform_owner(user)
    existing = db.query(AccountVerificationRequest).filter_by(
        submitted_by=user.id, subject_type="platform_ownership", status="pending").first()
    if existing:
        return avr_dict(existing)
    req = AccountVerificationRequest(
        subject_type="platform_ownership", submitted_by=user.id,
        evidence_checklist=body.evidence_checklist, evidence_notes=body.evidence_notes,
        evidence_media=[])
    db.add(req)
    db.commit()
    db.refresh(req)
    return avr_dict(req)


@router.get("/platform/my-requests")
def my_platform_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Latest request per gate (identity, ownership) for THIS OWNER, not any
    one listing — owner-visible, same reasoning as the business endpoint
    above. Also returns `verified`, the combined account-level result."""
    rows = (db.query(AccountVerificationRequest)
           .filter(AccountVerificationRequest.submitted_by == user.id,
                   AccountVerificationRequest.subject_type.in_(_PLATFORM_GATES_LOCAL))
           .order_by(AccountVerificationRequest.created_at.desc()).all())
    latest = {}
    for r in rows:
        latest.setdefault(r.subject_type, r)
    result = {k: avr_dict(v) for k, v in latest.items()}
    result["verified"] = platform_owner_verified(db, user.id)
    return result


@router.post("/platform/evidence")
def upload_ownership_evidence(request_id: int = Form(...), file: UploadFile = File(...),
                              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Attach a file (e.g. a login screen-recording) to the caller's own
    pending ownership request. Deleted automatically the moment a reviewer
    decides either way — see services.decide_verification / _wipe_evidence."""
    req = db.query(AccountVerificationRequest).filter_by(
        id=request_id, submitted_by=user.id, subject_type="platform_ownership",
        status="pending").first()
    if req is None:
        raise HTTPException(status_code=404, detail="No pending ownership request found")
    ref, _size = save_upload(f"verification/owner_{user.id}", file, _EVIDENCE_MAX_BYTES)
    req.evidence_media = (req.evidence_media or []) + [ref]
    db.commit()
    return avr_dict(req)


# ---------------------------------------------------------------------------
# Admin queue
# ---------------------------------------------------------------------------

@router.get("/queue")
def verification_queue(status: str = "pending",
                       user: User = Depends(RequirePerm(Perm.VERIFICATION_VIEW)),
                       db: Session = Depends(get_db)):
    rows = (db.query(AccountVerificationRequest)
           .filter(AccountVerificationRequest.status == status)
           .order_by(AccountVerificationRequest.created_at.asc()).all())
    return [{**avr_dict(r), **_submitter_context(db, r)} for r in rows]


class DecisionIn(BaseModel):
    reason: Optional[str] = None


@router.post("/queue/{request_id}/approve")
def approve_verification(request_id: int, body: DecisionIn, request: Request,
                         user: User = Depends(RequirePerm(Perm.VERIFICATION_DECIDE)),
                         db: Session = Depends(get_db)):
    req = db.get(AccountVerificationRequest, request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Request not found")
    try:
        req = decide_verification(db, req, approve=True, reviewer=user,
                                  reason=body.reason, request=request)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return avr_dict(req)


@router.post("/queue/{request_id}/reject")
def reject_verification(request_id: int, body: DecisionIn, request: Request,
                        user: User = Depends(RequirePerm(Perm.VERIFICATION_DECIDE)),
                        db: Session = Depends(get_db)):
    req = db.get(AccountVerificationRequest, request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Request not found")
    if not (body.reason or "").strip():
        raise HTTPException(status_code=422, detail="A reason is required to reject")
    try:
        req = decide_verification(db, req, approve=False, reviewer=user,
                                  reason=body.reason, request=request)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return avr_dict(req)
