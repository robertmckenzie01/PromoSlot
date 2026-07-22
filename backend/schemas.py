"""Pydantic request/response schemas."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    display_name: Optional[str] = Field(default=None, max_length=120)
    is_business: bool = False
    is_platform_owner: bool = False


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    is_business: bool
    is_platform_owner: bool

    model_config = {"from_attributes": True}
