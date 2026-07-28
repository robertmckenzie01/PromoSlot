"""TOTP multi-factor authentication (mandatory for Super-Admin).

Standard authenticator-app TOTP — no third-party vendor. Enrolment returns a
secret + otpauth URI, and single-use recovery codes are issued once at setup so
a lost device cannot cause permanent lockout.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import audit
from ..db import get_db
from ..deps import get_current_user
from ..models import User
from ..security import verify_password
from ..totp import (hash_code, new_recovery_codes, new_secret, provisioning_uri,
                    verify as totp_verify)

router = APIRouter(prefix="/mfa", tags=["mfa"])


class StartIn(BaseModel):
    password: str


class ConfirmIn(BaseModel):
    code: str = Field(min_length=6, max_length=10)


class DisableIn(BaseModel):
    password: str
    code: str


@router.get("/status")
def mfa_status(user: User = Depends(get_current_user)):
    from ..permissions import Role
    return {
        "enabled": bool(user.mfa_enabled),
        "required": user.role == Role.SUPER_ADMIN,
        "recovery_codes_remaining": len(user.mfa_recovery_codes or []),
    }


@router.post("/start")
def mfa_start(body: StartIn, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    """Generate a secret to add to an authenticator app. Not active until confirmed."""
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=403, detail="Password is incorrect")
    secret = new_secret()
    user.mfa_secret = secret          # stored but inactive until /confirm succeeds
    user.mfa_enabled = False
    db.commit()
    return {"secret": secret,
            "otpauth_uri": provisioning_uri(secret, user.email),
            "note": "Add this to your authenticator app, then confirm with a code."}


@router.post("/confirm")
def mfa_confirm(body: ConfirmIn, request: Request,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Activate MFA and issue single-use recovery codes (shown once)."""
    if not user.mfa_secret:
        raise HTTPException(status_code=409, detail="Start MFA setup first")
    if not totp_verify(user.mfa_secret, body.code):
        raise HTTPException(status_code=403, detail="That code isn't valid — try the next one")
    codes = new_recovery_codes()
    user.mfa_enabled = True
    user.mfa_recovery_codes = [hash_code(c) for c in codes]
    db.commit()
    audit.record(db, actor=user, action="mfa.enable", target_type="user",
                 target_id=user.id, previous_state={"mfa_enabled": False},
                 new_state={"mfa_enabled": True}, reason="MFA enrolment", request=request)
    # Plaintext codes are returned exactly once and never stored.
    return {"enabled": True, "recovery_codes": codes,
            "warning": "Save these now — they are shown only once and each works once."}


@router.post("/verify")
def mfa_verify(body: ConfirmIn, user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Check a TOTP code, or consume a recovery code if the device is lost."""
    if not user.mfa_enabled:
        raise HTTPException(status_code=409, detail="MFA is not enabled")
    if totp_verify(user.mfa_secret, body.code):
        return {"ok": True, "used_recovery_code": False}
    h = hash_code(body.code)
    codes = list(user.mfa_recovery_codes or [])
    if h in codes:
        codes.remove(h)                     # single use
        user.mfa_recovery_codes = codes
        db.commit()
        return {"ok": True, "used_recovery_code": True,
                "recovery_codes_remaining": len(codes)}
    raise HTTPException(status_code=403, detail="Invalid code")


@router.post("/disable")
def mfa_disable(body: DisableIn, request: Request,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..permissions import Role
    if user.role == Role.SUPER_ADMIN:
        raise HTTPException(status_code=403,
                            detail="MFA is mandatory for a Super-Admin and cannot be disabled.")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=403, detail="Password is incorrect")
    if not totp_verify(user.mfa_secret, body.code):
        raise HTTPException(status_code=403, detail="Invalid code")
    user.mfa_enabled = False
    user.mfa_secret = None
    user.mfa_recovery_codes = []
    db.commit()
    audit.record(db, actor=user, action="mfa.disable", target_type="user",
                 target_id=user.id, previous_state={"mfa_enabled": True},
                 new_state={"mfa_enabled": False}, reason="MFA disabled", request=request)
    return {"enabled": False}
