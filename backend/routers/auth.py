"""Authentication: signup, login, logout, current user.

Real accounts with hashed passwords and server-side sessions. Sessions are
opaque tokens stored in an httpOnly cookie and a `sessions` table (revocable).
"""
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..account_deactivation import reactivate_account_cascade
from ..config import settings
from ..db import get_db
from ..deps import COOKIE_NAME, assert_active, get_current_user
from ..mailer import password_reset_email, send_email, welcome_email
from .. import marketing
from ..models import (BannedEmail, EmailVerificationToken, PasswordResetToken,
                      Session as AuthSession, User)
from ..ratelimit import (client_ip, limit_login, limit_password_reset_request,
                         limit_password_reset_submit, limit_signup,
                         limit_verification_resend)
from ..schemas import (ChangePasswordIn, ForgotPasswordIn, LinkProfileIn, LoginIn,
                       ResetPasswordIn, SignupIn, TourIn, VerifyEmailIn, UserOut)
from ..security import hash_password, new_session_token, verify_password
from ..turnstile import verify_turnstile

log = logging.getLogger(__name__)

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
    # Lowest-id row of a linked pair is always the "primary" — see signup().
    return (db.query(User).filter(func.lower(User.email) == e)
            .order_by(User.id.asc()).first())


# No response_model: signup no longer returns a logged-in user, it returns a
# "check your email" acknowledgement.
@router.post("/signup", status_code=status.HTTP_201_CREATED,
            dependencies=[Depends(limit_signup)])
def signup(body: SignupIn, request: Request, response: Response, background: BackgroundTasks,
           db: Session = Depends(get_db)):
    if not verify_turnstile(body.turnstile_token or "", client_ip(request)):
        raise HTTPException(status_code=400,
                            detail="Could not verify you're not a bot. Please try again.")
    email = body.email.strip().lower()
    if not body.is_business and not body.is_platform_owner:
        raise HTTPException(status_code=422, detail="Select at least one role")
    # Checked independently of whatever row (if any) currently exists under
    # this email: deleting a banned account scrambles its own email column
    # to a placeholder, so `existing.banned_at` below can no longer catch a
    # ban that survived a since-deleted account. banned_emails is the record
    # that doesn't get erased along with it — see BannedEmail in models.py.
    if db.query(BannedEmail).filter(BannedEmail.email == email).first() is not None:
        raise HTTPException(
            status_code=403,
            detail="This email address is banned from PromoSlot and cannot be "
                   "used to create an account. Contact support if you believe "
                   "this is a mistake.")

    existing = find_by_email(db, email)
    if existing is not None:
        # A banned address is a distinct case from an ordinary duplicate — say so
        # plainly rather than implying they can just log in or reset a password.
        # (Belt-and-braces alongside the banned_emails check above: this still
        # catches a banned account that hasn't been deleted.)
        if existing.banned_at is not None:
            raise HTTPException(
                status_code=403,
                detail="This email address is banned from PromoSlot and cannot be "
                       "used to create an account. Contact support if you believe "
                       "this is a mistake.")
        raise HTTPException(status_code=409, detail="An account with that email already exists")

    # Choosing both roles now creates two separate, linked identities (own
    # name each) rather than one blended account — see linked_user_id on User.
    both = body.is_business and body.is_platform_owner
    name1 = (body.display_name or "").strip()
    name2 = (body.second_display_name or "").strip()
    if both:
        if not name1 or not name2:
            raise HTTPException(status_code=422,
                                detail="Enter a name for both your business and platform-owner profiles")
        if name1.lower() == name2.lower():
            raise HTTPException(status_code=422,
                                detail="Your business and platform-owner profiles need different names")

    # The business identity is always created first when both roles are chosen
    # together, making it the "primary" identity (see find_by_email above).
    # marketing_opt_in is only ever set here from an unticked checkbox they
    # actively checked — see SignupIn.marketing_opt_in and the User model
    # comment. Both linked identities (if any) share one real inbox, so both
    # get the same consent state rather than asking twice for one address.
    marketing_at = datetime.utcnow() if body.marketing_opt_in else None
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=name1 or None,
        is_business=True if both else body.is_business,
        is_platform_owner=False if both else body.is_platform_owner,
        marketing_opt_in=body.marketing_opt_in,
        marketing_opt_in_at=marketing_at,
        marketing_opt_in_source="signup" if body.marketing_opt_in else None,
    )
    db.add(user)
    db.flush()

    if both:
        secondary = User(
            email=email, password_hash=user.password_hash,
            display_name=name2, is_business=False, is_platform_owner=True,
            linked_user_id=user.id,
            marketing_opt_in=body.marketing_opt_in,
            marketing_opt_in_at=marketing_at,
            marketing_opt_in_source="signup" if body.marketing_opt_in else None,
        )
        db.add(secondary)
        db.flush()
        user.linked_user_id = secondary.id

    db.commit()
    db.refresh(user)
    # No session here: the account is unusable until the emailed link proves the
    # address is theirs. verified_at stays null and assert_active() blocks login.
    # One verification email covers both linked identities (same inbox) — see
    # verify_email() below, which stamps verified_at on the linked row too.
    token = _new_verification_token(db, user)
    # Only offered when they didn't already opt in on the form — no point
    # inviting someone to do the thing they just did.
    optin_url = (None if body.marketing_opt_in else
                _marketing_optin_url(marketing.create_optin_token(db, user)))
    # Best effort, and after the response is sent: send_email never raises, but
    # it can block up to its timeout, and a slow mail provider must never delay
    # or fail account creation.
    background.add_task(_send_welcome, user.email, user.display_name,
                        user.is_business, user.is_platform_owner, token, optin_url)
    return {"ok": True, "verification_required": True, "email": user.email,
            "message": "Account created. Check your email for the link to verify "
                       "your address — you'll be signed in as soon as you use it."}


def _marketing_optin_url(token: str) -> str:
    return f"{settings.app_base_url.rstrip('/')}/?optin={token}"


def _send_welcome(email: str, display_name: str, is_business: bool,
                  is_platform_owner: bool, verify_token: str = "",
                  optin_url: str = None) -> None:
    subject, html, text = welcome_email(display_name, is_business, is_platform_owner,
                                        verify_url=_verify_url(verify_token) if verify_token else "",
                                        optin_url=optin_url or "")
    ok, detail = send_email(email, subject, html, text)
    if not ok:
        # Not configured, or the provider rejected it. Logged, never surfaced as
        # a signup failure and never reported as delivered when it wasn't.
        log.warning("welcome email not sent to %s: %s", email, detail)


@router.post("/login", response_model=UserOut, dependencies=[Depends(limit_login)])
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = find_by_email(db, body.email)
    # Constant-ish response: verify even if user is missing to reduce enumeration.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # A correct password is exactly the bar deactivation was gated behind
    # (see routers/profiles.py:deactivate_my_account), so it reactivates
    # automatically here rather than making them find a separate "reactivate"
    # step — the account (and its linked identity, if any) is simply usable
    # again from this point on.
    if user.deactivated_at is not None:
        reactivate_account_cascade(db, user)
    # Only after the password check, so this never tells an anonymous caller
    # whether an address exists. Banned and suspended accounts are turned away
    # here rather than handed a session that 403s on every subsequent request.
    assert_active(user)
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


@router.post("/tour", response_model=UserOut)
def update_tour(body: TourIn, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Record one state change of the guided product tour.

    Narrow and single-purpose, on the model of /notifications/queue-viewed:
    tour progress is account state and has no business travelling through the
    profile-content endpoint.

    `current_step` only ever moves forward on advance/skip — walking back
    through earlier steps must not rewind where a resumed tour picks up.
    """
    now = datetime.utcnow()
    step = body.step
    seen = user.product_tour_current_step or 0
    if body.action == "start":
        # Restarting (from Help, or after a skip) makes the tour genuinely live
        # again rather than leaving it half-retired.
        user.product_tour_started_at = now
        user.product_tour_completed_at = None
        user.product_tour_skipped_at = None
        user.product_tour_current_step = step or 0
    elif body.action == "advance":
        if user.product_tour_started_at is None:
            user.product_tour_started_at = now
        if step is not None:
            user.product_tour_current_step = max(seen, step)
    elif body.action == "skip":
        user.product_tour_skipped_at = now
        if step is not None:
            user.product_tour_current_step = max(seen, step)
    elif body.action == "complete":
        user.product_tour_completed_at = now
        user.product_tour_skipped_at = None       # finishing beats abandoning
        if step is not None:
            user.product_tour_current_step = step
    if body.version:
        user.product_tour_version = body.version
    db.commit()
    db.refresh(user)
    return user


@router.post("/profile-viewed", response_model=UserOut)
def mark_profile_viewed(user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    """Record that this account has opened its own profile/account page at
    least once. Narrow and idempotent, on the same model as /auth/tour -
    drives the homepage checklist's "set up your public profile" step and
    nothing else."""
    if user.profile_setup_viewed_at is None:
        user.profile_setup_viewed_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user


VERIFY_TTL_HOURS = 24


def _verify_url(token: str) -> str:
    return f"{settings.app_base_url.rstrip('/')}/?verify={token}"


def _new_verification_token(db: Session, user: User) -> str:
    """Issue a fresh single-use token, retiring any earlier unused ones so only
    the most recent link works."""
    (db.query(EmailVerificationToken)
       .filter(EmailVerificationToken.user_id == user.id,
               EmailVerificationToken.used.is_(False))
       .update({"used": True}, synchronize_session=False))
    token = new_session_token()
    db.add(EmailVerificationToken(
        token=token, user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=VERIFY_TTL_HOURS)))
    db.commit()
    return token


@router.post("/verify-email", response_model=UserOut)
def verify_email(body: VerifyEmailIn, response: Response, db: Session = Depends(get_db)):
    """Confirm an address from a valid, unused, unexpired token — and sign them in.

    Clicking the link is the account's first proven action, so it both verifies
    and logs in; making them type a password straight after clicking a link they
    just received adds nothing.
    """
    t = db.get(EmailVerificationToken, body.token)
    if t is None or t.used or t.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400,
                            detail="That verification link is invalid or has expired. "
                                   "Request a new one from the login screen.")
    user = db.get(User, t.user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="That verification link is invalid.")

    t.used = True
    if user.verified_at is None:
        user.verified_at = datetime.utcnow()
        if user.linked_user_id:
            linked = db.get(User, user.linked_user_id)
            if linked and linked.verified_at is None:
                linked.verified_at = user.verified_at
    db.commit()
    db.refresh(user)

    # A banned or suspended account must not slip in through the link.
    assert_active(user)
    _issue_session(db, user, response)
    return user


def _retire_current_session(request: Request, db: Session) -> None:
    """Delete the session tied to the caller's current cookie, if any — used
    right before issuing a fresh one for a different identity."""
    token = request.cookies.get(COOKIE_NAME)
    if token:
        sess = db.get(AuthSession, token)
        if sess:
            db.delete(sess)
            db.commit()


@router.post("/link-profile", response_model=UserOut)
def link_profile(body: LinkProfileIn, request: Request, response: Response,
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create the caller's second, linked identity (business <-> platform-owner)
    under the same email, and switch the session straight into it.

    A person has at most two identities. If this account already has a
    linked_user_id, both roles already exist somewhere in that pair.
    """
    if user.linked_user_id is not None:
        raise HTTPException(status_code=409,
                            detail="You already have two linked profiles on this email.")
    wants_business = body.role == "business"
    if wants_business and user.is_business:
        raise HTTPException(status_code=409, detail="You already have a business profile.")
    if not wants_business and user.is_platform_owner:
        raise HTTPException(status_code=409, detail="You already have a platform-owner profile.")

    name = body.display_name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Enter a name for this profile.")
    if user.display_name and name.lower() == user.display_name.strip().lower():
        raise HTTPException(status_code=422,
                            detail="That name is already used by your other PromoSlot "
                                   "profile — choose a different one.")

    secondary = User(
        email=user.email, password_hash=user.password_hash,
        display_name=name, is_business=wants_business,
        is_platform_owner=not wants_business,
        verified_at=user.verified_at,   # same inbox, already proven — no new email
    )
    db.add(secondary)
    db.flush()
    secondary.linked_user_id = user.id
    user.linked_user_id = secondary.id
    db.commit()
    db.refresh(secondary)

    # Retire the old session and switch straight into the new identity — the
    # wizard step right after this call needs to be authenticated AS it.
    _retire_current_session(request, db)
    _issue_session(db, secondary, response)
    return secondary


@router.post("/switch-account", response_model=UserOut)
def switch_account(request: Request, response: Response,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Swap the active session to this person's other linked identity. Never
    re-checks a password: linked_user_id is only ever set by the backend
    itself, inside an already-authenticated action (signup or /link-profile) —
    never from anything client-supplied — so this can't be used to hop into
    someone else's account."""
    if user.linked_user_id is None:
        raise HTTPException(status_code=409, detail="No linked profile to switch to.")
    linked = db.get(User, user.linked_user_id)
    if linked is None:
        raise HTTPException(status_code=404, detail="Linked profile not found.")
    assert_active(linked)

    _retire_current_session(request, db)
    _issue_session(db, linked, response)
    return linked


@router.post("/resend-verification", dependencies=[Depends(limit_verification_resend)])
def resend_verification(body: ForgotPasswordIn, db: Session = Depends(get_db)):
    """Send a fresh verification link.

    Same privacy posture as forgot-password: the response never reveals whether
    the address is registered, or whether it is already verified. A link is only
    actually sent when a real, still-unverified account matches.
    """
    if not settings.email_configured:
        raise HTTPException(status_code=503,
                            detail="Verification email isn't configured yet. Contact support.")
    user = find_by_email(db, body.email)
    if user is not None and user.verified_at is None:
        token = _new_verification_token(db, user)
        subject, html, text = welcome_email(user.display_name, user.is_business,
                                            user.is_platform_owner,
                                            verify_url=_verify_url(token))
        ok, detail = send_email(user.email, subject, html, text)
        if not ok:
            raise HTTPException(status_code=502,
                                detail=f"Could not send the verification email ({detail}).")
    return {"ok": True,
            "message": "If that email needs verifying, a new link is on its way."}


RESET_TTL_MIN = 60


@router.post("/forgot-password", dependencies=[Depends(limit_password_reset_request)])
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


@router.post("/reset-password", dependencies=[Depends(limit_password_reset_submit)])
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
    # Same real person, same password — keep the linked identity in sync too.
    if user.linked_user_id:
        linked = db.get(User, user.linked_user_id)
        if linked:
            linked.password_hash = user.password_hash
            db.query(AuthSession).filter(AuthSession.user_id == linked.id).delete()
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
    # Same real person, same password — keep the linked identity in sync too.
    if user.linked_user_id:
        linked = db.get(User, user.linked_user_id)
        if linked:
            linked.password_hash = user.password_hash
    db.commit()
    return {"ok": True}
