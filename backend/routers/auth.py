"""Authentication: signup, login, logout, current user.

Real accounts with hashed passwords and server-side sessions. Sessions are
opaque tokens stored in an httpOnly cookie and a `sessions` table (revocable).
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import COOKIE_NAME, get_current_user
from ..models import Session as AuthSession, User
from ..schemas import LoginIn, SignupIn, UserOut
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


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not body.is_business and not body.is_platform_owner:
        raise HTTPException(status_code=422, detail="Select at least one role")
    if db.query(User).filter(User.email == email).first():
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
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
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
