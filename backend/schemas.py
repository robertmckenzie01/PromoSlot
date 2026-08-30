"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    display_name: Optional[str] = Field(default=None, max_length=120)
    is_business: bool = False
    is_platform_owner: bool = False
    # Only read when both is_business and is_platform_owner are true — the
    # second identity's own name. display_name is always the business
    # identity's name when both roles are chosen together (see signup()).
    second_display_name: Optional[str] = Field(default=None, max_length=120)
    # Cloudflare Turnstile solution from the signup form widget. See
    # backend/turnstile.py — blank/invalid is rejected only once a secret key
    # is actually configured (settings.turnstile_configured).
    turnstile_token: Optional[str] = None
    # Unticked by default on the form — see User.marketing_opt_in in
    # models.py. Only ever True here when the person actually checked the box.
    marketing_opt_in: bool = False


class GoogleCompleteSignupIn(BaseModel):
    """The role-selection step (task #21) a brand-new 'Continue with
    Google' identity still has to go through — everything else (email,
    verified status, display name suggestion) already came from Google
    itself at /auth/google/callback. Deliberately the same shape as the
    role/naming fields of SignupIn below, minus password/turnstile/email
    (Google already proved the email; no password is ever set here)."""
    token: str = Field(min_length=1)
    display_name: Optional[str] = Field(default=None, max_length=120)
    is_business: bool = False
    is_platform_owner: bool = False
    second_display_name: Optional[str] = Field(default=None, max_length=120)
    marketing_opt_in: bool = False


class LinkProfileIn(BaseModel):
    role: Literal["business", "platform_owner"]
    display_name: str = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=200)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class VerifyEmailIn(BaseModel):
    token: str


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


class TourIn(BaseModel):
    """One narrow state change to the guided product tour.

    Deliberately separate from the profile-update endpoint: this is account
    state, not profile content.
    """
    action: Literal["start", "advance", "skip", "complete"]
    step: Optional[int] = Field(default=None, ge=0, le=50)
    version: Optional[str] = Field(default=None, max_length=20)


class LinkedAccountBrief(BaseModel):
    id: int
    display_name: Optional[str] = None
    is_business: bool
    is_platform_owner: bool
    has_published_listing_or_campaign: bool = False
    # Read only to decide whether to surface this linked identity at all (see
    # UserOut's validator below) — never actually shown to the client, since a
    # banned linked profile is nulled out of the response entirely rather than
    # shown-but-labelled. Not worth hiding from the wire format: it's always
    # the caller's own second identity, never someone else's.
    banned_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    is_business: bool
    is_platform_owner: bool
    is_reviewer: bool = False
    avatar_url: Optional[str] = None
    intro_video_url: Optional[str] = None
    # Private — see User.phone in models.py. UserOut only ever serves the
    # authenticated account's own record (get_current_user), never another
    # party's, so including it here is safe.
    phone: Optional[str] = None
    linked_account: Optional[LinkedAccountBrief] = None

    @model_validator(mode="after")
    def _hide_banned_linked_account(self):
        """A banned linked profile is unusable (switching to it is blocked
        server-side regardless), so don't advertise it as a "Linked profiles"
        option at all — drop it from the response rather than show it in a
        state the user can't actually use. See routers/auth.py switch_account
        for the enforcement this mirrors."""
        if self.linked_account is not None and self.linked_account.banned_at is not None:
            self.linked_account = None
        return self
    # Tour state rides on the account so the client knows on first paint whether
    # to offer it, resume it, or stay quiet — no extra round trip.
    product_tour_started_at: Optional[datetime] = None
    product_tour_completed_at: Optional[datetime] = None
    product_tour_skipped_at: Optional[datetime] = None
    product_tour_current_step: int = 0
    product_tour_version: Optional[str] = None
    # Drives the homepage checklist's "set up your public profile" step.
    profile_setup_viewed_at: Optional[datetime] = None
    # Marketing-email consent — see User.marketing_opt_in in models.py. Read
    # by the My Account toggle to show current state on load.
    marketing_opt_in: bool = False

    model_config = {"from_attributes": True}
