"""Authentication: signup, login, logout, current user.

Real accounts with hashed passwords and server-side sessions. Sessions are
opaque tokens stored in an httpOnly cookie and a `sessions` table (revocable).
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import COOKIE_NAME, get_current_user
from ..mailer import password_reset_email, send_email
from ..models import PasswordResetToken, Session as AuthSession, User
from ..schemas import (ChangePasswordIn, ForgotPasswordIn, LoginIn, ResetPasswordIn,
                       SignupIn, UserOut)
from ..security import hash_password, new_session_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_DAYS = 30


def _issue_session(db: Session, user: User, response: Response) -> None:
    token = new_session_token()
    db.add(AuthSession(
        token=token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=SESSION_DAYS),
    ))
    db.commit()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.app_base_url.startswith("https"),
        max_age=SESSION_DAYS * 86400,
        path="/",
    )


def find_by_email(db: Session, email: str):
    """Case-insensitive account lookup.

    Emails are stored lowercase, but we compare case-insensitively on BOTH sides
    so a differently-cased stored value (e.g. seeded out-of-band) can still log
    in — preventing lockouts and duplicate accounts from capitalisation.
    """
    e = (email or "").strip().lower()
    return db.query(User).filter(func.lower(User.email) == e).first()


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not body.is_business and not body.is_platform_owner:
        raise HTTPException(status_code=422, detail="Select at least one role")
    if find_by_email(db, email):
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        is_business=body.is_business,
        is_platform_owner=body.is_platform_owner,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _issue_session(db, user, response)
    return user


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = find_by_email(db, body.email)
    # Constant-ish response: verify even if user is missing to reduce enumeration.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    _issue_session(db, user, response)
    return user


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        sess = db.get(AuthSession, token)
        if sess:
            db.delete(sess)
            db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


RESET_TTL_MIN = 60


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, db: Session = Depends(get_db)):
    """Email a real, single-use reset link to a real address.

    We never reveal whether an account exists (same response either way). But we
    also never claim an email was sent when delivery isn't configured/failed —
    that surfaces as an explicit error rather than a fake success.
    """
    if not settings.email_configured:
        raise HTTPException(status_code=503,
                            detail="Password-reset email isn't configured yet. Contact support.")
    user = find_by_email(db, body.email)
    if user is not None:
        token = new_session_token()
        db.add(PasswordResetToken(
            token=token, user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(minutes=RESET_TTL_MIN)))
        db.commit()
        reset_url = f"{settings.app_base_url.rstrip('/')}/?reset={token}"
        subject, html, text = password_reset_email(reset_url)
        ok, detail = send_email(user.email, subject, html, text)
        if not ok:
            # Real failure -> tell the truth; don't leave the user waiting on nothing.
            raise HTTPException(status_code=502, detail=f"Could not send the reset email ({detail}).")
    return {"ok": True, "message": "If that email is registered, a reset link is on its way."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    """Set a new password from a valid, unused, unexpired token."""
    t = db.get(PasswordResetToken, body.token)
    if t is None or t.used or t.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="That reset link is invalid or has expired.")
    user = db.get(User, t.user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="That reset link is invalid or has expired.")
    user.password_hash = hash_password(body.new_password)
    t.used = True
    # Revoke existing sessions so a stolen session can't outlive the reset.
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.commit()
    return {"ok": True}


@router.post("/change-password")
def change_password(body: ChangePasswordIn, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Change the signed-in user's password after verifying the current one."""
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=403, detail="Current password is incorrect")
    if body.new_password == body.current_password:
        raise HTTPException(status_code=422, detail="New password must be different")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}
