"""Append-only administrative audit logging.

Every privileged action records who did it, to what, the before/after state, the
stated reason, and request metadata. The table is immutable at the database
level (triggers reject UPDATE/DELETE) — this module only ever inserts.
"""
import uuid

from fastapi import Request
from sqlalchemy.orm import Session

from .models import AdminAuditLog


def request_id(request: Request = None) -> str:
    """Correlation id: honour an upstream header if present, else generate one."""
    if request is not None:
        for h in ("x-request-id", "x-correlation-id"):
            v = request.headers.get(h)
            if v:
                return v[:120]
    return uuid.uuid4().hex


def client_ip(request: Request = None) -> str:
    if request is None:
        return ""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:                       # first hop is the original client
        return fwd.split(",")[0].strip()[:60]
    return (request.client.host if request.client else "")[:60]


def record(db: Session, *, actor, action: str, target_type: str = None,
           target_id=None, previous_state=None, new_state=None,
           reason: str = None, request: Request = None) -> AdminAuditLog:
    """Insert one immutable audit entry. Never raises on metadata problems."""
    entry = AdminAuditLog(
        actor_id=getattr(actor, "id", None),
        actor_role=getattr(actor, "role", None),
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        previous_state=previous_state,
        new_state=new_state,
        reason=(reason or "").strip() or None,
        ip_address=client_ip(request),
        request_id=request_id(request),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
