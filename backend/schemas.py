"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


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
    linked_account: Optional[LinkedAccountBrief] = None
    # Tour state rides on the account so the client knows on first paint whether
    # to offer it, resume it, or stay quiet — no extra round trip.
    product_tour_started_at: Optional[datetime] = None
    product_tour_completed_at: Optional[datetime] = None
    product_tour_skipped_at: Optional[datetime] = None
    product_tour_current_step: int = 0
    product_tour_version: Optional[str] = None

    model_config = {"from_attributes": True}
