"""Delivery proof submission and retrieval.

The platform owner (the deliverer) submits evidence for a FUNDED deal. Proof
only counts once a real file is stored server-side, or a real URL is provided.
"""
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deal_state import PROOF_CLOSED_STATES, can_transition
from ..deps import get_current_user
from ..permissions import Perm, has_permission
from ..models import Deal, DealStatus, Notification, Proof, User
from ..storage import save_proof_file, serve_stored, stored_exists

router = APIRouter(tags=["proofs"])

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif")


def _deal_or_404(db: Session, deal_id: int) -> Deal:
    d = db.get(Deal, deal_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    return d


def _is_party(d: Deal, user: User) -> bool:
    return user.id in (d.business_id, d.platform_owner_id)


def _is_image(path) -> bool:
    return bool(path) and path.lower().endswith(IMAGE_EXTS)


def proof_dict(p: Proof) -> dict:
    return {
        "id": p.id,
        "deal_id": p.deal_id,
        "kind": p.kind,
        "has_file": bool(p.stored_path),
        # Same-origin URL the review UI renders directly (image) or links to (pdf).
        "file_url": f"/deals/{p.deal_id}/proof/{p.id}/file" if p.stored_path else None,
        "is_image": _is_image(p.stored_path),
        "url": p.url,
        "submitted_by": p.submitted_by,
    }


@router.post("/deals/{deal_id}/proof", status_code=201)
def submit_proof(
    deal_id: int,
    kind: str = Form(...),
    url: Optional[str] = Form(None),
    views_delivered: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    d = _deal_or_404(db, deal_id)
    if user.id != d.platform_owner_id:
        raise HTTPException(status_code=403, detail="Only the platform owner submits delivery proof")
    if d.funded_at is None:
        raise HTTPException(status_code=409, detail="Deal must be funded before submitting proof")
    if d.status in PROOF_CLOSED_STATES:
        raise HTTPException(status_code=409,
                            detail=f"This deal is {d.status} — evidence can no longer be added.")

    has_file = file is not None and (file.filename or "") != ""
    has_url = bool(url and url.strip())
    if not has_file and not has_url:
        raise HTTPException(status_code=422, detail="Provide a file or a URL")

    stored_path = None
    if has_file:
        # Delivery evidence accepts any file type; only the size cap applies.
        try:
            stored_path, _size = save_proof_file(d.id, file, settings.max_upload_bytes)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

    p = Proof(
        deal_id=d.id,
        kind=kind,
        stored_path=stored_path,
        url=url.strip() if has_url else None,
        submitted_by=user.id,
    )
    db.add(p)
    # Owner-reported delivered views, backed by the evidence they just supplied.
    if views_delivered is not None and views_delivered >= 0:
        d.views_delivered = views_delivered
    # Reads straight from deal_state.py's shared ALLOWED_TRANSITIONS table
    # instead of a hardcoded allow-list of statuses — a hardcoded list here is
    # exactly what caused a real bug (task #140): CHANGES_REQUESTED ->
    # PROOF_SUBMITTED was always a legal transition per the table, but nothing
    # actually drove it, so a resubmission after a reviewer asked for changes
    # silently left the deal stuck showing changes_requested forever. Sourcing
    # this from can_transition() means a future addition to the table (or a
    # forgotten one) can't cause that same class of bug again. A deal already
    # at PROOF_SUBMITTED or UNDER_REVIEW correctly stays put — this is a "move
    # forward if possible" check, not a requirement that evidence always
    # advances the status; adding more evidence while a reviewer already has
    # it is allowed (see the PROOF_CLOSED_STATES guard above for what isn't).
    if can_transition(d.status, DealStatus.PROOF_SUBMITTED):
        d.status = DealStatus.PROOF_SUBMITTED
    # Real event -> notify the business that evidence was submitted.
    db.add(Notification(user_id=d.business_id, type="proof_submitted",
                        body=f"Delivery evidence submitted for deal #{d.id}.", ref=str(d.id)))
    db.commit()
    db.refresh(p)
    return proof_dict(p)


@router.get("/deals/{deal_id}/proofs")
def list_proofs(deal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = _deal_or_404(db, deal_id)
    if not (_is_party(d, user) or has_permission(user, Perm.DEAL_VIEW_EVIDENCE)):
        raise HTTPException(status_code=403, detail="Not permitted")
    rows = db.query(Proof).filter_by(deal_id=d.id).order_by(Proof.id.desc()).all()
    return [proof_dict(p) for p in rows]


@router.get("/deals/{deal_id}/proof/{proof_id}/file")
def get_proof_file(deal_id: int, proof_id: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    d = _deal_or_404(db, deal_id)
    if not (_is_party(d, user) or has_permission(user, Perm.DEAL_VIEW_EVIDENCE)):
        raise HTTPException(status_code=403, detail="Not permitted")
    p = db.get(Proof, proof_id)
    if p is None or p.deal_id != d.id:
        raise HTTPException(status_code=404, detail="Proof not found")
    if not p.stored_path or not stored_exists(p.stored_path):
        raise HTTPException(status_code=404, detail="No stored file for this proof")
    # inline so the review UI can render images (and preview PDFs) in-page.
    return serve_stored(p.stored_path, inline=True)
