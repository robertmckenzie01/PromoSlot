"""Shared FastAPI dependencies (authentication)."""
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DBSession

from .db import get_db
from .models import Session as AuthSession, User

COOKIE_NAME = "ps_session"


def _user_from_request(request: Request, db: DBSession) -> Optional[User]:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    sess = db.get(AuthSession, token)
    if not sess or sess.expires_at < datetime.utcnow():
        return None
    return db.get(User, sess.user_id)


def get_current_user(request: Request, db: DBSession = Depends(get_db)) -> User:
    user = _user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Not authenticated")
    return user


def get_current_user_optional(request: Request, db: DBSession = Depends(get_db)) -> Optional[User]:
    return _user_from_request(request, db)
