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
from sqlalchemy.orm import relationship

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
    UNDER_REVIEW = "under_review"     # an admin has picked up the evidence
    CHANGES_REQUESTED = "changes_requested"
    REJECTED = "rejected"
    VERIFIED = "verified"             # == eligible for payout
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

    # ---- Authorization tier (backend permission concept; never a public badge) ----
    # USER | ADMIN | SUPER_ADMIN. Re-read from the DB on every protected request.
    role = Column(String, default="USER", nullable=False, index=True)
    suspended_at = Column(DateTime)             # set -> all power + access revoked
    suspended_reason = Column(String)
    # When a timed suspension lifts. NULL while suspended means indefinite —
    # "not suspended" is distinguished by suspended_at being NULL, as before.
    # Cleared automatically by scripts/expire_suspensions.py.
    suspended_until = Column(DateTime)
    banned_at = Column(DateTime)
    # Static 8-digit action code, required alongside the password on every
    # dangerous action (mandatory for SUPER_ADMIN). Null = not set up yet, which
    # gates privileged actions without affecting normal login.
    #
    # Hashed with the password hasher (salted PBKDF2, 240k iterations), not the
    # unsalted digest used for recovery codes — 8 digits is only 10^8, so a fast
    # hash would be trivially brute-forced from a database leak. Because the code
    # never rotates, the failure counter below is the compensating control that
    # TOTP's time window used to provide.
    action_code_hash = Column(String)
    action_code_failed_attempts = Column(Integer, default=0, nullable=False)
    action_code_locked_until = Column(DateTime)

    # Email ownership proven by clicking a real emailed link. Null = unverified,
    # which blocks login (see deps.assert_active). Every account that existed
    # before verification shipped was backfilled by the migration, so only
    # accounts created afterwards ever start out null.
    verified_at = Column(DateTime)

    # Public "who we are" profile content (editable from My Account / campaign setup).
    about_text = Column(Text)
    links = Column(JSON, default=list)          # [{label, url}, …] — no cap
    # Profile media (set from My Account).
    avatar_path = Column(String)
    avatar_content_type = Column(String)
    intro_video_path = Column(String)          # profile intro video (separate from My Work)
    intro_video_content_type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def avatar_url(self):
        return f"/users/{self.id}/avatar" if self.avatar_path else None

    @property
    def intro_video_url(self):
        return f"/users/{self.id}/intro-video" if self.intro_video_path else None


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
    brand = Column(String)                       # owner's brand/display name
    name = Column(String, nullable=False)
    platform_type = Column(String, nullable=False)
    handle = Column(String)
    bio = Column(Text)
    niches = Column(JSON, default=list)
    audience = Column(Integer, default=0)
    avg_views = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    engagement_rate = Column(Integer, default=0)  # basis points (e.g. 740 = 7.4%)
    services = Column(JSON, default=list)
    pricing = Column(JSON, default=list)
    meta = Column(JSON, default=dict)            # countries / ages / interests
    verified = Column(Boolean, default=False, nullable=False)  # only by human review
    image_path = Column(String)                  # listing picture
    image_content_type = Column(String)
    # Moderation: a softer option than removal — hidden from the marketplace
    # but preserved, and restorable by a Super-Admin.
    suspended_at = Column(DateTime)
    suspended_reason = Column(String)
    suspended_until = Column(DateTime)          # see User.suspended_until
    # Owner-initiated removal, kept distinct from admin suspension above. Set
    # only when real deals reference this listing: the row must survive so those
    # deals (and the reviews/past-campaign history built on them) still resolve.
    # With no deals attached the row is hard-deleted instead and this stays NULL.
    removed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PlatformMedia(Base):
    """Per-listing media: portfolio samples ('work') and past-campaign entries.

    kind='work'          -> a video sample of the owner's content style.
    kind='past_campaign' -> a previous campaign (brand/what/stat) with optional video.
    Videos are stored via the same disk-storage flow as delivery proof (see
    storage.py); both move to object storage together in the future.
    """
    __tablename__ = "platform_media"
    id = Column(Integer, primary_key=True)
    platform_id = Column(Integer, ForeignKey("platforms.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String, nullable=False)        # 'work' | 'past_campaign'
    title = Column(String)                        # caption (work) / what was done (past)
    brand = Column(String)                        # past_campaign only
    stat = Column(String)                         # past_campaign only
    video_path = Column(String)                   # stored file path (nullable)
    content_type = Column(String)                 # video mime type
    original_filename = Column(String)
    # Link-based work samples: an external link plus its own cover image.
    link_url = Column(String)                     # external content link (nullable)
    cover_path = Column(String)                   # stored cover image path (nullable)
    cover_content_type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Campaign(Base):
    """A business campaign listing (job-post style)."""
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    industry = Column(String)
    description = Column(Text)
    # Advertised budget in whole pounds (a public figure, never charged). Actual
    # money moves through Deal.listed_price, which is in pence.
    budget = Column(Integer, default=0)
    terms = Column(JSON, default=dict)
    image_path = Column(String)                  # campaign picture
    image_content_type = Column(String)
    # Moderation: hidden from the marketplace but preserved and restorable.
    suspended_at = Column(DateTime)
    suspended_reason = Column(String)
    suspended_until = Column(DateTime)          # see User.suspended_until
    # Owner-initiated removal — see Platform.removed_at.
    removed_at = Column(DateTime)
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

    # Delivery metrics shown on the owner's Past campaigns once completed.
    # promised: from the agreed terms; delivered: reported by the owner with
    # their delivery evidence (never inferred or invented).
    views_promised = Column(Integer)
    views_delivered = Column(Integer)

    # Money-state gates — set ONLY from real confirmed events
    funded_at = Column(DateTime)     # set on payment_intent.succeeded webhook
    verified_at = Column(DateTime)   # set by a human reviewer action
    paid_at = Column(DateTime)       # set on transfer/payout confirmation

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # The two real parties (for showing each side's actual identity, never "You").
    business = relationship("User", foreign_keys=[business_id])
    platform_owner = relationship("User", foreign_keys=[platform_owner_id])
    # Read-only links to what the deal came from, so a deal can tell whether its
    # listing/campaign was removed by the other side (see deals.deal_dict).
    platform = relationship("Platform", foreign_keys=[platform_id])
    campaign = relationship("Campaign", foreign_keys=[campaign_id])


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
    """Records every processed inbound webhook id for idempotency.

    Shared by the Stripe receiver (raw event id) and the Resend inbound receiver
    (namespaced "resend:{email_id}") so the two can never collide.
    """
    __tablename__ = "webhook_events"
    id = Column(String, primary_key=True)  # "evt_..." | "resend:{email_id}"
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


class Conversation(Base):
    """A direct-message thread between two real accounts.

    Participants are stored sorted (user_lo <= user_hi) so a pair maps to a
    stable row regardless of who starts it. context_ref optionally scopes the
    thread to a subject (a listing "p12" or campaign "c7") — messaging someone
    about one listing is a separate thread from a general DM.
    """
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    user_lo = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_hi = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    context_ref = Column(String, index=True)   # "p12" | "c7" | None (general DM)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_message_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class AdminAuditLog(Base):
    """Immutable record of every administrative action.

    Append-only: database triggers (see the Alembic migration) reject UPDATE and
    DELETE on this table on both Postgres and SQLite, so the history cannot be
    rewritten through the ORM, the API, or a direct SQL console.
    """
    __tablename__ = "admin_audit_log"
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"), index=True)      # acting admin
    actor_role = Column(String)
    action = Column(String, nullable=False, index=True)                 # e.g. "deal.verify"
    target_type = Column(String)                                        # user | deal | listing | campaign
    target_id = Column(String, index=True)
    previous_state = Column(JSON)
    new_state = Column(JSON)
    reason = Column(Text)
    ip_address = Column(String)
    request_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class ProfileAsset(Base):
    """A file/image a member adds to their public profile ("who we are")."""
    __tablename__ = "profile_assets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String)
    path = Column(String, nullable=False)
    content_type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PasswordResetToken(Base):
    """A single-use, expiring password-reset token emailed to a real address.

    The token itself is random and stored as-is (dev); it is invalidated on use
    and on expiry, and every reset also revokes the user's existing sessions.
    """
    __tablename__ = "password_reset_tokens"
    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EmailVerificationToken(Base):
    """A single-use, expiring token emailed to prove ownership of an address.

    Same shape as PasswordResetToken: random token as the primary key,
    invalidated on use and on expiry.
    """
    __tablename__ = "email_verification_tokens"
    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SupportTicket(Base):
    """A real 'Contact Support' submission — stored so an admin/reviewer can act
    on it (and can later be emailed out when SMTP is configured)."""
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)  # may be null (logged out)
    name = Column(String, nullable=False)
    email = Column(String)
    mobile = Column(String)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    handled = Column(Boolean, default=False, nullable=False)
    # Shared queue with a single owner: the first reviewer to claim a ticket owns
    # it and is the only one who may send the customer-facing reply. Claiming is
    # an atomic "update ... where assigned_to_id is null", so two reviewers
    # racing cannot both win (see routers/support.py).
    assigned_to_id = Column(Integer, ForeignKey("users.id"), index=True)
    claimed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class SupportTicketEvent(Base):
    """The timeline on a ticket: replies out, and reviewer-only internal notes.

    kind='reply'    -> sent to the submitter by email (and in-app if they have an
                       account). Customer-facing.
    kind='note'     -> internal. Never emailed, never shown to the submitter.
    kind='submitter_reply' -> came IN from the person who raised the ticket, by
                       replying to the support email. author_id is null: no
                       PromoSlot account wrote it.
    kind='claim' / 'transfer' -> ownership changes, kept here so the thread reads
                       in order. The immutable record of these is the audit log.
    """
    __tablename__ = "support_ticket_events"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), index=True)
    kind = Column(String, nullable=False)
    body = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    author = relationship("User", foreign_keys=[author_id])


class Message(Base):
    """A single message in a conversation. `read` = read by the recipient.

    Only ever created by a real sender via POST /messages — never fabricated,
    and no replies are ever authored on anyone's behalf.
    """
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    body = Column(Text, nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
