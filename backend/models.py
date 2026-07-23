"""Core data model for the PromoSlot marketplace.

Money is stored in integer minor units (pence) to avoid float errors.
Deal money-state is tracked by explicit boolean/timestamp gates that are only
ever set by real events (a confirmed Stripe charge, a human verification, a
confirmed Stripe transfer) — never optimistically.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text,
)

from .db import Base


class DealStatus:
    """String status constants (kept as plain strings for easy migration)."""
    DRAFT = "draft"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    AWAITING_FUNDING = "awaiting_funding"
    FUNDED = "funded"
    IN_DELIVERY = "in_delivery"
    PROOF_SUBMITTED = "proof_submitted"
    VERIFIED = "verified"
    PAID = "paid"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String)
    is_business = Column(Boolean, default=False, nullable=False)
    is_platform_owner = Column(Boolean, default=False, nullable=False)
    # Not self-serve: granted out-of-band (scripts/make_reviewer.py). A reviewer
    # is a human on the PromoSlot side who verifies delivery evidence.
    is_reviewer = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ConnectedAccount(Base):
    """A platform owner's Stripe v2 connected account (payout destination).

    Uses Accounts v2: the payout gate is the recipient's
    `stripe_balance.stripe_transfers` capability being active. Mirrored here from
    live Stripe reads / v2 account events — never set optimistically.
    """
    __tablename__ = "connected_accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stripe_account_id = Column(String, unique=True, nullable=False, index=True)
    # Can the account receive transfers yet? (stripe_transfers capability active)
    transfers_active = Column(Boolean, default=False, nullable=False)
    # Are there still onboarding requirements outstanding?
    requirements_due = Column(Boolean, default=True, nullable=False)
    transfers_status = Column(String)  # raw capability status for debugging
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Platform(Base):
    """A platform-owner listing (TikTok page, Discord community, newsletter, ...)."""
    __tablename__ = "platforms"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    platform_type = Column(String, nullable=False)
    handle = Column(String)
    bio = Column(Text)
    niches = Column(JSON, default=list)
    audience = Column(Integer, default=0)
    avg_views = Column(Integer, default=0)
    engagement_rate = Column(Integer, default=0)  # basis points (e.g. 740 = 7.4%)
    services = Column(JSON, default=list)
    pricing = Column(JSON, default=list)
    verified = Column(Boolean, default=False, nullable=False)  # only by human review
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Campaign(Base):
    """A business campaign listing (job-post style)."""
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    industry = Column(String)
    description = Column(Text)
    budget = Column(Integer, default=0)  # pence
    terms = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Deal(Base):
    """The agreement + money state between a business and a platform owner."""
    __tablename__ = "deals"
    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    platform_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    platform_id = Column(Integer, ForeignKey("platforms.id"))
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))

    terms = Column(JSON, default=dict)
    status = Column(String, default=DealStatus.DRAFT, nullable=False, index=True)

    # Split-fee model, all fees calculated on the agreed/listed price (pence):
    #   business is charged  listed_price + buyer_fee  (buyer_fee_percent)
    #   owner receives       listed_price - seller_fee (seller_fee_percent)
    #   PromoSlot take       buyer_fee + seller_fee
    listed_price = Column(Integer, default=0, nullable=False)  # agreed/listed price
    currency = Column(String, default="gbp", nullable=False)
    seller_fee_percent = Column(Integer, default=10, nullable=False)
    buyer_fee_percent = Column(Integer, default=5, nullable=False)

    # Stripe references (set as real events occur)
    payment_intent_id = Column(String, index=True)
    charge_id = Column(String)
    transfer_id = Column(String)
    refund_id = Column(String)

    # Both-party approval (real actions by real accounts)
    business_approved = Column(Boolean, default=False, nullable=False)
    owner_approved = Column(Boolean, default=False, nullable=False)

    # Money-state gates — set ONLY from real confirmed events
    funded_at = Column(DateTime)     # set on payment_intent.succeeded webhook
    verified_at = Column(DateTime)   # set by a human reviewer action
    paid_at = Column(DateTime)       # set on transfer/payout confirmation

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Payment(Base):
    """A Stripe PaymentIntent charging the business into the platform balance."""
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    stripe_payment_intent_id = Column(String, unique=True, index=True)
    amount = Column(Integer, nullable=False)  # pence
    currency = Column(String, default="gbp", nullable=False)
    status = Column(String, default="requires_payment_method", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Transfer(Base):
    """A Stripe Transfer paying the platform owner after verified delivery."""
    __tablename__ = "transfers"
    id = Column(Integer, primary_key=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    stripe_transfer_id = Column(String, unique=True, index=True)
    destination_account = Column(String)  # connected acct id
    amount = Column(Integer, nullable=False)  # pence (net, after fee)
    currency = Column(String, default="gbp", nullable=False)
    status = Column(String, default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Proof(Base):
    """Delivery evidence — only counts when a real file/link is stored."""
    __tablename__ = "proofs"
    id = Column(Integer, primary_key=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    kind = Column(String, nullable=False)          # link | screenshot | analytics | ...
    stored_path = Column(String)                    # server-side stored file
    url = Column(String)                            # or a submitted URL
    submitted_by = Column(Integer, ForeignKey("users.id"))
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Verification(Base):
    """A deliberate human-reviewer decision on submitted evidence."""
    __tablename__ = "verifications"
    id = Column(Integer, primary_key=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    decision = Column(String, nullable=False)       # approved | rejected
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Review(Base):
    """A review — only ever attached to a genuinely completed (paid) deal.

    author_id is the reviewer; reviewee_id is the other party being reviewed.
    One review per (deal, author).
    """
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Notification(Base):
    """Only created in response to a real event (payment, message, application)."""
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    ref = Column(String)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class WebhookEvent(Base):
    """Records every processed Stripe event id for idempotency."""
    __tablename__ = "webhook_events"
    id = Column(String, primary_key=True)  # Stripe event id (evt_...)
    type = Column(String, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Session(Base):
    """Server-side auth session — opaque token stored in an httpOnly cookie."""
    __tablename__ = "sessions"
    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
