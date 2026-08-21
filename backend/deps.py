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


def assert_active(user: User) -> None:
    """Reject an account that has lost access. Shared by the per-request gate and
    the login gate so the two can never disagree about who is allowed in."""
    # Belt-and-braces: a deletion already revokes every session and scrambles
    # the email/password so this path shouldn't normally be reachable at all,
    # but a request already in flight (or a lingering session row that
    # somehow survived) must still be turned away rather than silently served.
    if user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This account has been deleted.")
    if user.banned_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This account has been banned from PromoSlot.")
    if user.suspended_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This account is suspended.")
    # Same belt-and-braces reasoning as deleted_at above: a correct password at
    # login clears this before a session is ever issued (see routers/auth.py),
    # so a live session should never carry a deactivated user — but if one
    # somehow does, it's turned away here rather than served.
    if user.deactivated_at is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This account is deactivated.")
    if user.verified_at is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Please verify your email before logging in. "
                                   "Check your inbox for the link we sent you.")


def get_current_user(request: Request, db: DBSession = Depends(get_db)) -> User:
    user = _user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Not authenticated")
    assert_active(user)
    return user


def get_current_user_optional(request: Request, db: DBSession = Depends(get_db)) -> Optional[User]:
    """Like get_current_user but returns None instead of raising.

    Reuses assert_active so "who counts as an active account" is defined once.
    It previously inlined its own suspended/banned test, which would have
    silently missed the verification rule added later.
    """
    user = _user_from_request(request, db)
    if user is None:
        return None
    try:
        assert_active(user)
    except HTTPException:
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
