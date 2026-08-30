"""Google OAuth 2.0 ("Continue with Google") sign-in.

Standard authorization-code web flow, three endpoints:
  GET  /auth/google/login            browser navigation -> Google's consent screen
  GET  /auth/google/callback         Google redirects back here with a one-time code
  POST /auth/google/complete-signup  role-selection step (#21) for a brand-new identity

Login/callback are full-page browser redirects, not JSON XHR calls — mirrors
routers/connect.py's `RedirectResponse(url="/?xyz=return")` pattern rather
than auth.py's JSON error responses, since there's no frontend JS in the
loop between Google's redirect and our own page reloading.

The two outbound calls to Google (token exchange, userinfo) use plain
urllib — same no-new-dependency approach as turnstile.py's Cloudflare call —
rather than adding a Google client library for three lines of HTTP.

Nothing here trusts anything the browser supplies except the one-time
`code`, which is exchanged directly with Google server-to-server (never
taken from a client-controlled field), and `email_verified` is checked
explicitly on Google's own userinfo response before an email is ever
treated as proven — that's the entire basis account-linking rests on.
"""
import json
import logging
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..account_deactivation import reactivate_account_cascade
from ..config import settings
from ..db import get_db
from ..deps import assert_active
from ..models import BannedEmail, GooglePendingSignup, User
from ..ratelimit import limit_google_oauth
from ..schemas import GoogleCompleteSignupIn, UserOut
from ..security import hash_password, new_session_token
from .auth import _issue_session, _send_welcome, find_by_email

log = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/google", tags=["auth"])

_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_STATE_COOKIE = "google_oauth_state"
_PENDING_TTL_MINUTES = 30


def _redirect_uri() -> str:
    return f"{settings.app_base_url.rstrip('/')}/auth/google/callback"


def _require_configured() -> None:
    if not settings.google_oauth_configured:
        # Same "refuse to run rather than half-work" posture as every other
        # optional integration in config.py — a half-built OAuth redirect
        # (no client_id) would fail on Google's side with a confusing error,
        # so this fails fast on our own side with a clear one instead.
        raise HTTPException(status_code=503, detail="Google sign-in isn't configured yet.")


@router.get("/login", dependencies=[Depends(limit_google_oauth)])
def google_login(request: Request):
    _require_configured()
    # CSRF protection for the redirect round-trip: Google echoes this value
    # back verbatim on /callback, checked there against the cookie set here.
    # Without it, an attacker could start their own OAuth flow, capture the
    # callback, and hand the resulting code/state to a victim's browser.
    state = secrets.token_urlsafe(24)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    redirect = RedirectResponse(url=f"{_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}")
    redirect.set_cookie(
        key=_STATE_COOKIE, value=state, httponly=True, samesite="lax",
        secure=settings.app_base_url.startswith("https"), max_age=600, path="/auth/google",
    )
    return redirect


def _exchange_code(code: str) -> dict:
    """POST the authorization code to Google's token endpoint. Raises on any
    non-2xx response or network failure — the caller treats that as a
    generic failed-login, never a partial/guessed identity."""
    payload = urllib.parse.urlencode({
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": _redirect_uri(),
        "grant_type": "authorization_code",
    }).encode()
    req = urllib.request.Request(_TOKEN_URL, data=payload, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode() or "{}")


def _fetch_userinfo(access_token: str) -> dict:
    req = urllib.request.Request(_USERINFO_URL, method="GET")
    req.add_header("Authorization", f"Bearer {access_token}")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode() or "{}")


@router.get("/callback", dependencies=[Depends(limit_google_oauth)])
def google_login_callback(request: Request, db: Session = Depends(get_db),
                          code: str = None, state: str = None, error: str = None):
    """Exchange the code, resolve who this is, and sign them in or park them
    at role-selection. Account linking: a first-ever Google login for an
    email that already has a password account is linked automatically
    (google_sub backfilled onto the existing row) rather than creating a
    second, duplicate account — safe because Google has already proven
    control of that exact email, the same trust bar a password-reset email
    already relies on, so no extra confirmation step is needed.
    """
    _require_configured()
    # error= is what Google sends back if the person cancels/denies consent
    # on its own screen — a normal, expected outcome, not a failure to log.
    if error or not code:
        return RedirectResponse(url="/?google_auth=cancelled")

    cookie_state = request.cookies.get(_STATE_COOKIE)
    if not cookie_state or not state or not secrets.compare_digest(cookie_state, state):
        return RedirectResponse(url="/?google_auth=error")

    try:
        token_data = _exchange_code(code)
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("no access_token in Google's token response")
        profile = _fetch_userinfo(access_token)
    except Exception as e:
        log.warning("google oauth exchange failed: %s", e)
        return RedirectResponse(url="/?google_auth=error")

    google_sub = profile.get("sub")
    email = (profile.get("email") or "").strip().lower()
    email_verified = profile.get("email_verified")
    if not google_sub or not email or email_verified not in (True, "true"):
        return RedirectResponse(url="/?google_auth=error")
    name = (profile.get("name") or "").strip() or None

    redirect = RedirectResponse(url="/?google_auth=success")
    redirect.delete_cookie(_STATE_COOKIE, path="/auth/google")

    user = db.query(User).filter(User.google_sub == google_sub).first()
    if user is None:
        user = find_by_email(db, email)
        if user is not None:
            user.google_sub = google_sub
            db.commit()

    if user is not None:
        if user.deactivated_at is not None:
            reactivate_account_cascade(db, user)
        # Google has already verified this email — equal or stronger proof
        # than clicking our own emailed link, so a Google login can satisfy
        # verified_at itself rather than being blocked behind it. Must
        # happen BEFORE assert_active(), which otherwise rejects a
        # never-verified account outright.
        if user.verified_at is None:
            user.verified_at = datetime.utcnow()
            db.commit()
        try:
            assert_active(user)
        except HTTPException as e:
            log.info("google login blocked for user %s: %s", user.id, e.detail)
            blocked = RedirectResponse(url="/?google_auth=blocked")
            blocked.delete_cookie(_STATE_COOKIE, path="/auth/google")
            return blocked
        _issue_session(db, user, redirect)
        return redirect

    # Brand new identity — no PromoSlot account at all yet.
    if db.query(BannedEmail).filter(BannedEmail.email == email).first() is not None:
        banned = RedirectResponse(url="/?google_auth=banned")
        banned.delete_cookie(_STATE_COOKIE, path="/auth/google")
        return banned

    token = new_session_token()
    db.add(GooglePendingSignup(
        token=token, google_sub=google_sub, email=email, display_name=name,
        expires_at=datetime.utcnow() + timedelta(minutes=_PENDING_TTL_MINUTES)))
    db.commit()
    pending = RedirectResponse(url=f"/?google_signup={token}")
    pending.delete_cookie(_STATE_COOKIE, path="/auth/google")
    return pending


@router.post("/complete-signup", response_model=UserOut)
def complete_google_signup(body: GoogleCompleteSignupIn, response: Response,
                           background: BackgroundTasks,
                           db: Session = Depends(get_db)):
    """Finish a pending Google signup once role(s) are chosen — mirrors
    auth.signup()'s User-row creation exactly (including the linked-identity
    shape for "both roles"), minus the password/turnstile/verification-email
    steps that don't apply here."""
    row = db.get(GooglePendingSignup, body.token)
    if row is None or row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400,
                            detail="This sign-up link has expired — start over with "
                                   "Continue with Google.")
    if not body.is_business and not body.is_platform_owner:
        raise HTTPException(status_code=422, detail="Select at least one role")

    email = row.email  # already lowercased + Google-verified at /callback time
    # Re-checked here, not just at /callback: time has passed while the
    # role-selection screen was open — long enough in principle for someone
    # else to have signed up with this email, or for it to have been banned
    # since. signup() doesn't need this (single request start-to-finish);
    # this two-step flow does.
    if db.query(BannedEmail).filter(BannedEmail.email == email).first() is not None:
        db.delete(row)
        db.commit()
        raise HTTPException(
            status_code=403,
            detail="This email address is banned from PromoSlot and cannot be "
                   "used to create an account. Contact support if you believe "
                   "this is a mistake.")
    existing = find_by_email(db, email)
    if existing is not None:
        db.delete(row)
        db.commit()
        if existing.banned_at is not None:
            raise HTTPException(
                status_code=403,
                detail="This email address is banned from PromoSlot and cannot be "
                       "used to create an account. Contact support if you believe "
                       "this is a mistake.")
        raise HTTPException(status_code=409,
                            detail="An account with that email already exists — sign in instead.")

    both = body.is_business and body.is_platform_owner
    name1 = (body.display_name or row.display_name or "").strip()
    name2 = (body.second_display_name or "").strip()
    if both:
        if not name1 or not name2:
            raise HTTPException(status_code=422,
                                detail="Enter a name for both your business and platform-owner profiles")
        if name1.lower() == name2.lower():
            raise HTTPException(status_code=422,
                                detail="Your business and platform-owner profiles need different names")

    marketing_at = datetime.utcnow() if body.marketing_opt_in else None
    now = datetime.utcnow()
    # No password is ever set from this flow: a real, unguessable random
    # hash still satisfies the NOT NULL column but can never be logged into
    # by guessing. The account stays fully usable — they authenticate via
    # Google, or set a real password later through the ordinary "forgot
    # password" flow, which works the same regardless of how the account
    # was created.
    unusable_password = hash_password(secrets.token_urlsafe(32))
    user = User(
        email=email, password_hash=unusable_password, display_name=name1 or None,
        is_business=True if both else body.is_business,
        is_platform_owner=False if both else body.is_platform_owner,
        google_sub=row.google_sub,
        verified_at=now,  # Google already verified this email — no link to click
        marketing_opt_in=body.marketing_opt_in,
        marketing_opt_in_at=marketing_at,
        marketing_opt_in_source="signup" if body.marketing_opt_in else None,
    )
    db.add(user)
    db.flush()

    if both:
        secondary = User(
            email=email, password_hash=unusable_password, display_name=name2,
            is_business=False, is_platform_owner=True, linked_user_id=user.id,
            verified_at=now,
            marketing_opt_in=body.marketing_opt_in,
            marketing_opt_in_at=marketing_at,
            marketing_opt_in_source="signup" if body.marketing_opt_in else None,
        )
        db.add(secondary)
        db.flush()
        user.linked_user_id = secondary.id

    db.delete(row)
    db.commit()
    db.refresh(user)

    background.add_task(_send_welcome, user.email, user.display_name,
                        user.is_business, user.is_platform_owner)

    _issue_session(db, user, response)
    return user
