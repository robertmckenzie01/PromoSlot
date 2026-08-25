"""Marketing-email consent: opt-in/opt-out state and the one-click tokens
that back it (opt-in invite links in transactional emails, and unsubscribe
links in future marketing emails).

Separate from the 11 transactional emails in mailer.py entirely — those are
sent regardless of this flag (they're not marketing, PECR's soft-opt-in and
consent rules don't apply to service messages about someone's own account or
deals). This module only governs promotional/campaign email, which doesn't
exist yet (see routers/marketing.py) but needs consent captured correctly
from day one so nothing has to be retrofitted once it does.

Every path that sets marketing_opt_in = True is a real, explicit action:
the signup checkbox, the My Account toggle, or clicking a one-click opt-in
link — never inferred, never defaulted on. See User.marketing_opt_in in
models.py for why every existing account starts opted-out.
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from .models import MarketingOptToken, User
from .security import new_session_token

OPTIN_TOKEN_TTL_DAYS = 30  # a promotional nudge going stale is fine; unsubscribe links (below) never expire


def set_marketing_preference(db: Session, user: User, enabled: bool, source: str) -> User:
    """The one place marketing_opt_in is ever written. Only stamps
    marketing_opt_in_at/source the moment it actually turns on — turning it
    back off leaves that history in place rather than erasing when they'd
    once said yes, which is useful if consent is ever questioned later."""
    user.marketing_opt_in = enabled
    if enabled and user.marketing_opt_in_at is None:
        user.marketing_opt_in_at = datetime.utcnow()
        user.marketing_opt_in_source = source
    db.commit()
    return user


def create_optin_token(db: Session, user: User) -> str:
    """A 30-day link inviting someone to opt in, for use in a transactional
    email's footer. Not single-use — re-clicking an already-used invite link
    is harmless and shouldn't error."""
    token = new_session_token()
    db.add(MarketingOptToken(
        token=token, user_id=user.id, purpose="optin",
        expires_at=datetime.utcnow() + timedelta(days=OPTIN_TOKEN_TTL_DAYS)))
    db.commit()
    return token


def create_unsubscribe_token(db: Session, user: User) -> str:
    """A permanent link for a marketing email's unsubscribe footer. No
    expiry — PECR requires opting out to stay easy at any time, a stale
    unsubscribe link would defeat that."""
    token = new_session_token()
    db.add(MarketingOptToken(token=token, user_id=user.id, purpose="unsubscribe",
                             expires_at=None))
    db.commit()
    return token


def consume_token(db: Session, token: str, purpose: str) -> Optional[User]:
    """Look up a token for the given purpose, apply the corresponding
    preference change, and return the affected user — or None if the token
    doesn't exist, is for the other purpose, or has expired."""
    row = db.get(MarketingOptToken, token)
    if row is None or row.purpose != purpose:
        return None
    if row.expires_at is not None and row.expires_at < datetime.utcnow():
        return None
    user = db.get(User, row.user_id)
    if user is None:
        return None
    set_marketing_preference(db, user, enabled=(purpose == "optin"), source="email_link")
    return user
