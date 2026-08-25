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
from sqlalchemy.orm import relationship, object_session

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
    # No longer globally unique at the column level — a person's two linked
    # identities (see linked_user_id below) share the same email. Real
    # uniqueness is enforced per-role by two partial indexes added in the
    # migration (at most one business identity and one platform-owner
    # identity per email).
    email = Column(String, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String)
    is_business = Column(Boolean, default=False, nullable=False)
    is_platform_owner = Column(Boolean, default=False, nullable=False)
    # Not self-serve: granted out-of-band (scripts/make_reviewer.py). A reviewer
    # is a human on the PromoSlot side who verifies delivery evidence.
    is_reviewer = Column(Boolean, default=False, nullable=False)

    # Self-referential link to this person's OTHER identity under the same
    # email (business <-> platform-owner). NULL for every single-role account,
    # including every legacy "both roles on one row" account (never touched,
    # never linked). A person has at most two identities — always set
    # symmetrically on both rows in the same transaction (see signup() and
    # link_profile() in routers/auth.py). Deliberately a plain nullable FK,
    # not a join table: the ceiling is exactly two, always.
    linked_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

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
    # Set once this account's personal data has been wiped (self-service or by
    # a Super-Admin) — see routers/profiles.py:delete_my_account /
    # routers/admin.py:delete_user. Distinct from banned_at: a ban is a
    # misconduct call the person can't undo; deletion is the person's own
    # right to erasure (or an admin acting on their request). The row is
    # never removed — deals/reviews/messages that reference this id must keep
    # working for the other party and for accounting/dispute retention — so
    # this flag is what marks "treat as gone" everywhere the account would
    # otherwise be displayed or allowed to log in.
    deleted_at = Column(DateTime)
    # Set when the person pauses their own account — reversible, unlike
    # deleted_at above. Nothing is scrubbed: email, password, profile content
    # and any listings/campaigns are left exactly as they are. Blocks login
    # the same way suspended_at/banned_at do (see deps.assert_active), but a
    # correct password at the login form clears this automatically (see
    # routers/auth.py:login) rather than requiring a separate "reactivate"
    # step — see account_deactivation.py for the full cascade. This identity's
    # own Platform/Campaign rows are suspended alongside it (see
    # account_deactivation.py) so "not live" is actually true while paused.
    deactivated_at = Column(DateTime)
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

    # Private — never returned from any public/other-party endpoint (see
    # routers/reviews.py:public_profile, which builds its own dict and never
    # touches this). Optional emergency-contact channel, used only for the
    # rare time-sensitive case where a reviewer needs to reach a platform
    # owner directly (e.g. an open proof-update grace period, see
    # Deal.proof_grace_deadline) — not used for marketing or bulk SMS, and
    # PromoSlot currently has no automated SMS/voice integration, so in
    # practice this means a reviewer sees it and can choose to call by hand.
    phone = Column(String)
    # {"review": iso8601, "payouts": iso8601, "support": iso8601} — when this admin
    # last opened each shared queue. Drives "new since you looked" nav dots.
    # Messages isn't here: Message.read already tracks that per-recipient.
    # Reassign the whole dict when updating — a plain JSON column doesn't notice
    # in-place mutation of its contents.
    queue_last_viewed_at = Column(JSON, default=dict)
    # Profile media (set from My Account).
    avatar_path = Column(String)
    avatar_content_type = Column(String)
    intro_video_path = Column(String)          # profile intro video (separate from My Work)
    intro_video_content_type = Column(String)

    # ---- Guided product tour (first-run onboarding) ----
    # All three timestamps NULL = never offered, the only state that triggers the
    # welcome card. The backend is authoritative so a finished tour stays finished
    # on every device; the client mirrors it only for smooth in-page state.
    # Skipped and completed are kept apart deliberately: skipping leaves the
    # "continue setup tour" affordance available, completing retires it.
    product_tour_started_at = Column(DateTime)
    product_tour_completed_at = Column(DateTime)
    product_tour_skipped_at = Column(DateTime)
    # 0-based index of the furthest step reached, so a resumed tour picks up
    # where it left off rather than restarting.
    product_tour_current_step = Column(Integer, default=0, nullable=False)
    # Bump the client's TOUR_VERSION when the steps change materially; an old
    # completed tour can then be re-offered without losing what they already saw.
    product_tour_version = Column(String)

    # Set the first time this user opens their own account/profile page.
    # Drives the homepage "getting started" checklist's "set up your public
    # profile" step - NULL = not yet, so the checklist item stays open.
    profile_setup_viewed_at = Column(DateTime)

    # ---- Marketing email consent (PECR/UK GDPR) ----
    # False by default for every account, including everyone who signed up
    # before this field existed — there is no compliant default other than
    # opted-out until someone actively says yes. Never set True anywhere
    # except a real, explicit action (signup checkbox, account-settings
    # toggle, or clicking a one-click opt-in link in an email) — see
    # backend/marketing.py. source records which of those it was, for the
    # audit trail; at records when, both null until opt-in happens once.
    marketing_opt_in = Column(Boolean, default=False, nullable=False)
    marketing_opt_in_at = Column(DateTime)
    marketing_opt_in_source = Column(String)  # "signup" | "settings" | "email_link"

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def avatar_url(self):
        return f"/users/{self.id}/avatar" if self.avatar_path else None

    @property
    def intro_video_url(self):
        return f"/users/{self.id}/intro-video" if self.intro_video_path else None

    @property
    def has_published_listing_or_campaign(self) -> bool:
        """Does this specific identity already have real content of its own?
        Used only to stop re-offering the 'set up your other profile' upsell
        once they've actually used it — not a permission check."""
        sess = object_session(self)
        if sess is None:
            return False
        if self.is_platform_owner:
            return sess.query(Platform.id).filter(Platform.owner_id == self.id).first() is not None
        if self.is_business:
            return sess.query(Campaign.id).filter(Campaign.business_id == self.id).first() is not None
        return False

    linked_account = relationship(
        "User", remote_side=[id], foreign_keys=[linked_user_id],
        uselist=False, post_update=True)


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
    # Standing preference: "always pay me instantly when eligible". Never acted
    # on without a fresh live eligibility check against Stripe — see
    # services.try_instant_payout(). Owner bears Stripe's instant-payout fee.
    instant_payout_opt_in = Column(Boolean, default=False, nullable=False)
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

    # Pricing model, deliberately composable rather than a fixed set of named
    # deal "types". "hybrid" is NOT its own value here on purpose: a business
    # wants pure per-view pricing for its own reasons (zero guaranteed cost),
    # while a platform owner often wants a floor for theirs (paid for the
    # work regardless of algorithm luck) — which of those wins is a per-deal
    # negotiation, not a category chosen once at listing time. So a "hybrid"
    # deal is simply a per_view/per_impression deal where listed_price is
    # also > 0, not a separate model value. listed_price above already is
    # that optional fixed floor; everything below is the pool on top of it.
    pricing_model = Column(String, default="fixed", nullable=False)  # fixed | per_view | per_impression

    # Rate is always whole pence per a whole unit count (e.g. 10p per 1,000
    # views) — enforced at listing creation, never fractional pence — so
    # payout math (floor(verified_quantity / rate_unit_quantity) * rate_unit_pence)
    # can never produce a fractional penny. Null for pricing_model="fixed".
    rate_unit_pence = Column(Integer)
    rate_unit_quantity = Column(Integer)

    # The pre-funded pool a business commits for the price-per portion, pence
    # (e.g. 1000 = £10.00 — same minor-unit convention as listed_price above).
    # Charged together with listed_price in one combined PaymentIntent at
    # funding. Null for pricing_model="fixed".
    pool_max_budget = Column(Integer)

    # Selectable campaign window. campaign_duration_days is what's actually
    # collected at deal creation (a business picks "runs for N days", not
    # absolute dates a deal might sit unfunded for days before ever
    # reaching) — bounded 1-60, enforced in routers/deals.py. The real
    # campaign_starts_at/campaign_ends_at are only ever computed from
    # funded_at once funding actually succeeds (see
    # services.mark_deal_funded_from_pi), the same way every other
    # money-state field here is set only from a real confirmed event, never
    # optimistically at creation time. There is exactly one settlement
    # event, at campaign_ends_at (or shortly after, once a reviewer has
    # verified it) — never a running/incremental release. Early completion
    # never shortens this; see proof_grace_deadline below for the one
    # exception to "wait until the end", which pushes the review out
    # further, never earlier.
    campaign_duration_days = Column(Integer)
    campaign_starts_at = Column(DateTime)
    campaign_ends_at = Column(DateTime)

    # Set exactly once, at settlement, from the same verified_quantity a
    # reviewer recorded on the Verification row. released = paid to the
    # platform owner (fee taken on this slice only); refunded = returned to
    # the business fee-free. released + refunded should always equal
    # pool_max_budget for a settled pool/hybrid deal.
    pool_released_amount = Column(Integer)
    pool_refunded_amount = Column(Integer)
    pool_settled_at = Column(DateTime)

    # Set when a reviewer suspects submitted proof undersells what was
    # actually delivered (verified independently, not just from what's on
    # file) and wants to give the platform owner a fair chance to add to it
    # before final settlement, rather than either paying out on an unproven
    # number or silently authoring the extra evidence themselves. Reuses the
    # existing CHANGES_REQUESTED status/notes flow — this is just the
    # deadline attached to that specific case. Settlement cannot finalize
    # while this is set and still in the future.
    proof_grace_deadline = Column(DateTime)

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

    # Instant Payout detail on an already-PAID deal — never a new deal state.
    # NULL means "standard scheduled payout" (the default, no fee). Set only
    # after a real Stripe Payout(method="instant") succeeds on top of the
    # existing Transfer. instant_net_amount is what actually lands after
    # Stripe's own instant-payout fee (owner bears it, per deal_money terms).
    instant_payout_id = Column(String)
    instant_net_amount = Column(Integer)
    instant_requested_at = Column(DateTime)

    # Chargeback lifecycle — mirrored from Stripe's charge.dispute.* events.
    # dispute_status is a cheap denormalised read of the most recent Dispute's
    # raw Stripe status (see Dispute.status below), so deal lists and detail
    # views don't need a join just to show the read-only "under review" badge.
    # Null once there has never been a dispute, or once the last one closed.
    dispute_status = Column(String)
    # Only ever set while an UNPAID deal is frozen into DealStatus.DISPUTED, so
    # a won/withdrawn dispute can put the deal back exactly where it was. Never
    # touched for a deal that was already PAID — PAID never moves (see
    # deal_state.py and services.close_dispute_from_event).
    status_before_dispute = Column(String)

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


class Dispute(Base):
    """A real Stripe chargeback (charge.dispute.*) on a deal's charge.

    One row per Stripe dispute id — chargebacks don't repeat on the same
    charge, but the row is looked up by stripe_dispute_id (not deal_id) so
    updated/closed webhooks always land on the right record even if a deal
    somehow saw more than one over its life.

    Reason codes, the Stripe dispute id itself, the evidence deadline and the
    accept/challenge decision are ADMIN-ONLY (see routers/disputes.py) — the
    business and platform owner only ever see a read-only, non-alarming
    "payment dispute under review" state on the deal, derived from whether
    this row is still open (see Deal.dispute_status).

    PromoSlot's Connect config makes the platform the responsible party for
    every charge (separate charges & transfers, fees_collector/losses_collector
    = "application" in routers/connect.py) — so it's always PromoSlot, never
    the platform owner's connected account, that Stripe expects a response
    from. If that configuration ever changes to direct charges, this
    assumption — and the admin-only response flow below — would need revisiting.
    """
    __tablename__ = "disputes"
    id = Column(Integer, primary_key=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=False, index=True)
    stripe_dispute_id = Column(String, unique=True, nullable=False, index=True)
    charge_id = Column(String, nullable=False, index=True)

    amount = Column(Integer, nullable=False)          # pence, disputed amount
    currency = Column(String, default="gbp", nullable=False)
    reason = Column(String)                            # Stripe reason code
    # Raw Stripe dispute.status: warning_needs_response | warning_under_review |
    # warning_closed | needs_response | under_review | won | lost.
    status = Column(String, nullable=False)
    evidence_due_by = Column(DateTime)

    # True if the deal's payout had already been released (Transfer already
    # sent to the platform owner) at the moment this dispute opened — the
    # scenario where a chargeback becomes a real absorbed loss rather than
    # just money that never gets released. Set once, at creation.
    payout_already_released = Column(Boolean, default=False, nullable=False)
    # The deal's DealStatus immediately before this dispute froze it, so a
    # won/withdrawn outcome can restore it exactly. Null when the deal was
    # already PAID (PAID never moves — see models.Deal.status_before_dispute).
    deal_status_before = Column(String)

    outcome = Column(String)          # won | lost | warning_closed — set on close
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime)
    funds_withdrawn_at = Column(DateTime)
    funds_reinstated_at = Column(DateTime)

    # Shared-queue ownership, same pattern as SupportTicket: first admin to
    # claim/assign owns it; anyone with dispute.manage can still view and note.
    assigned_to_id = Column(Integer, ForeignKey("users.id"), index=True)
    claimed_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    deal = relationship("Deal", foreign_keys=[deal_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class DisputeEvent(Base):
    """The admin-only timeline on a dispute.

    kind='system'       -> auto-logged from a webhook (opened, status changed,
                            funds withdrawn/reinstated, closed + outcome).
    kind='note'         -> internal admin note. Never shown to either party.
    kind='request_info' -> admin asked a party (business|owner) for something
                            (a message, a deliverable, a screenshot) before
                            finalising the response in Stripe. Logged here and
                            also sent as a real Notification to that party;
                            their reply comes back through the existing
                            messaging system, not a bespoke channel.
    kind='claim' / 'assign' -> ownership changes, kept here so the thread
                            reads in order (audit log is the immutable record).
    """
    __tablename__ = "dispute_events"
    id = Column(Integer, primary_key=True)
    dispute_id = Column(Integer, ForeignKey("disputes.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), index=True)  # null for kind='system'
    kind = Column(String, nullable=False)
    body = Column(Text)
    target_party = Column(String)     # 'business' | 'owner' — only set for request_info
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    author = relationship("User", foreign_keys=[author_id])


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
    # The actual quantity (views/impressions) a reviewer confirms at the
    # point of decision — lives here, not on Proof, because Proof is only
    # ever what the platform owner submitted (unverified); this is what a
    # human reviewer decided about it. The pool settlement step reads this
    # number rather than having an admin retype or re-derive it later. Null
    # for a plain fixed-price deal, or any decision that isn't "approved".
    verified_quantity = Column(Integer)
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


class BannedEmail(Base):
    """A currently-banned email address, kept independently of the users row.

    Closes a real gap: account deletion (self-service or admin) scrubs the
    users row's email to a placeholder, so a ban recorded only as
    User.banned_at is silently lost the moment that account is deleted — the
    person could just sign up again with the same address. This table is the
    actual enforcement record: written when ban_user() runs (before the real
    email can ever be scrambled), checked at signup regardless of whether the
    original account still exists, and removed again by unban_user() so
    lifting a ban actually lifts it. Deliberately not populated by deletion
    or suspension — suspension is meant to be recoverable and time-limited on
    its own, and a never-banned account's email must stay free to re-signup
    after deletion, exactly as it does today.
    """
    __tablename__ = "banned_emails"
    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True, index=True)  # normalized lowercase
    banned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reason = Column(String)


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


class MarketingOptToken(Base):
    """A one-click token for marketing-email consent links (opt-in invites in
    transactional emails, and unsubscribe links in future marketing emails).

    Same shape as the other tokens above, with one difference: expires_at is
    nullable. An opt-in invite gets a real expiry (it's a promotional nudge,
    stale ones shouldn't work forever); an unsubscribe link gets none — PECR
    requires opting out to stay easy at any time, so that link must never go
    stale. purpose distinguishes which action a token performs; not
    single-use like the others, since re-clicking an opt-in/unsubscribe link
    is just idempotent, not a security concern the way a reused password
    reset would be.
    """
    __tablename__ = "marketing_opt_tokens"
    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    purpose = Column(String, nullable=False)  # "optin" | "unsubscribe"
    expires_at = Column(DateTime)  # null = never expires (unsubscribe links)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MarketingCampaignSend(Base):
    """One row per campaign that has actually gone out, ever. This is the
    whole state machine behind marketing.send_campaign_now(): the batch
    sender looks at marketing.CAMPAIGN_REGISTRY (an ordered list of
    (slug, render_fn) in mailer.py), finds the first slug with no row here,
    and sends that one. A slug that already has a row is permanently done —
    the sender is idempotent no matter how many times its trigger fires,
    it never re-sends a campaign that's already gone out once.

    recipient_count/failure_count are the real per-user send.ok() tally from
    that run, not an estimate, so a partial-failure send is visible rather
    than silently reported as a clean success.
    """
    __tablename__ = "marketing_campaign_sends"
    id = Column(Integer, primary_key=True)
    campaign_slug = Column(String, nullable=False, unique=True, index=True)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    recipient_count = Column(Integer, nullable=False, default=0)
    failure_count = Column(Integer, nullable=False, default=0)


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
