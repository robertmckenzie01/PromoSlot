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

from . import mailer
from .config import settings
from .models import MarketingCampaignSend, MarketingOptToken, User
from .security import new_session_token

OPTIN_TOKEN_TTL_DAYS = 30  # a promotional nudge going stale is fine; unsubscribe links (below) never expire

# Ordered list of every campaign that exists, in the order they should go
# out. Each entry is (slug, render_fn) where render_fn(unsubscribe_url) ->
# (subject, html, text) — see mailer.receipts_campaign_email() for the
# shape. send_campaign_now() below always sends the FIRST slug that has no
# row in marketing_campaign_sends yet, so adding a new campaign here is the
# entire mechanism for "next month's send": append it to the end of this
# list, nothing else has to change. Once every entry here has a row (i.e.
# every campaign built so far has already gone out once), send_campaign_now()
# no-ops rather than silently repeating the oldest one — add a new campaign
# to resume.
CAMPAIGN_REGISTRY = [
    ("receipts-relationships-not-reach", mailer.receipts_campaign_email),
]


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


def next_campaign(db: Session):
    """The (slug, render_fn) that should go out next, or None if every
    campaign in CAMPAIGN_REGISTRY has already been sent once."""
    already_sent = {row.campaign_slug for row in db.query(MarketingCampaignSend).all()}
    for slug, render_fn in CAMPAIGN_REGISTRY:
        if slug not in already_sent:
            return slug, render_fn
    return None


def send_campaign_now(db: Session) -> dict:
    """Sends the next pending campaign (per next_campaign()) to every user
    with marketing_opt_in == True, each with their own real unsubscribe
    token, and records the send so it can never go out twice.

    Not gated on any particular cadence here — callers (the cron-secret
    endpoint in routers/marketing.py, or an admin trigger) decide when this
    runs. What makes "send once a month" safe to call more than once is that
    a campaign already recorded in marketing_campaign_sends is permanently
    done: calling this again the same month, or by accident, just returns
    {"sent": False, "reason": "no_pending_campaign"} instead of resending.

    Returns a plain dict (not an exception) either way, since "nothing to
    send right now" is an expected, non-error outcome, not a failure.
    """
    nxt = next_campaign(db)
    if nxt is None:
        return {"sent": False, "reason": "no_pending_campaign"}
    slug, render_fn = nxt

    recipients = db.query(User).filter(User.marketing_opt_in.is_(True)).all()
    ok_count = 0
    fail_count = 0
    for user in recipients:
        token = create_unsubscribe_token(db, user)
        unsubscribe_url = f"{settings.app_base_url.rstrip('/')}/?unsubscribe={token}"
        subject, html, text = render_fn(unsubscribe_url)
        ok, _detail = mailer.send_email(user.email, subject, html, text)
        if ok:
            ok_count += 1
        else:
            fail_count += 1

    # A campaign with real recipients that ALL failed (e.g. Resend/email
    # outage) is not "done" — recording it here would permanently skip it,
    # since a slug once in marketing_campaign_sends never gets picked again
    # (see next_campaign()). Only mark it done when at least one person
    # actually got it, or when there was genuinely nobody to send to (an
    # empty opted-in list isn't a failure, there's nothing to retry).
    total_failure = recipients and ok_count == 0
    if total_failure:
        return {"sent": False, "reason": "send_failed",
                "campaign": slug, "recipients_attempted": len(recipients)}

    db.add(MarketingCampaignSend(campaign_slug=slug, recipient_count=ok_count,
                                 failure_count=fail_count))
    db.commit()
    return {"sent": True, "campaign": slug, "recipients": ok_count, "failed": fail_count}
