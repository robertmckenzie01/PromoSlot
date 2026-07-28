"""Shared FastAPI dependencies (authentication + authorization).

The acting user — and crucially their ROLE — is loaded fresh from the database on
every protected request. Nothing about privileges is ever taken from the client,
and a suspended or banned account loses access immediately on its next request
even if it still holds a valid session cookie.
"""
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DBSession

from .db import get_db
from .models import Session as AuthSession, User
from .permissions import Perm, require_permission

COOKIE_NAME = "ps_session"


def _user_from_request(request: Request, db: DBSession) -> Optional[User]:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    sess = db.get(AuthSession, token)
    if not sess or sess.expires_at < datetime.utcnow():
        return None
    # Fresh read: role/suspension are always current, never cached client-side.
    return db.get(User, sess.user_id)


def _assert_active(user: User) -> None:
    if user.banned_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This account has been banned.")
    if user.suspended_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This account is suspended.")


def get_current_user(request: Request, db: DBSession = Depends(get_db)) -> User:
    user = _user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Not authenticated")
    _assert_active(user)
    return user


def get_current_user_optional(request: Request, db: DBSession = Depends(get_db)) -> Optional[User]:
    user = _user_from_request(request, db)
    if user is not None and (user.suspended_at is not None or user.banned_at is not None):
        return None
    return user


def RequirePerm(permission: str):
    """Dependency factory: declare the named permission an endpoint requires.

    Deny-by-default — anything not explicitly granted by the user's DB role is
    rejected with 403, independently of whatever the front end chose to show.
    """
    def _dep(user: User = Depends(get_current_user)) -> User:
        require_permission(user, permission)
        return user
    return _dep


# Delivery review is a permission now, not a boolean flag on the row.
def get_current_reviewer(user: User = Depends(get_current_user)) -> User:
    """A reviewer is anyone whose role grants delivery-verification rights."""
    require_permission(user, Perm.DEAL_VIEW_EVIDENCE)
    return user
