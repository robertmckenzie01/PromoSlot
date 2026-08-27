"""standalone business profile + account verification pipeline

Adds two tables:
  - businesses: a real backing row for a business identity. Previously this
    didn't exist at all — "S.biz" in promoslot-app.js is purely client-side
    wizard state, never persisted, so business.verified had nowhere real to
    live. One row per business-role User (owner_id, unique). Not a
    replacement for the existing pattern elsewhere (e.g. campaigns.business_id
    -> users.id) — those stay exactly as they are; this is an additional
    profile/verification anchor only.
  - account_verification_requests: one row per verification submission,
    covering three subject_types — business_identity, platform_identity
    (reuses the Stripe check platform owners already do for payouts, via
    their existing connected_accounts row) and platform_ownership (evidence
    a platform owner controls the account they've listed, no Stripe
    involved). Deliberately its own append-style table rather than a status
    column, so every decision keeps a real record of what was reviewed and
    by whom — same reasoning as the existing `verifications` table (deal
    delivery) having its own history rather than a status field on `deals`.
    Not to be confused with that table: this one is account-level identity,
    that one is deal-level delivery evidence.

Revision ID: 86d65b48fc2b
Revises: a91d5c3f7e28
"""
import sqlalchemy as sa
from alembic import op

revision = "86d65b48fc2b"
down_revision = "a91d5c3f7e28"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("product", sa.String(), nullable=True),
        sa.Column("industry", sa.String(), nullable=True),
        sa.Column("target", sa.String(), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("stripe_account_id", sa.String(), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_businesses_owner_id", "businesses", ["owner_id"], unique=True)
    op.create_index("ix_businesses_stripe_account_id", "businesses", ["stripe_account_id"], unique=True)

    op.create_table(
        "account_verification_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subject_type", sa.String(), nullable=False),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("businesses.id"), nullable=True),
        sa.Column("platform_id", sa.Integer(), sa.ForeignKey("platforms.id"), nullable=True),
        sa.Column("submitted_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stripe_legal_name", sa.String(), nullable=True),
        sa.Column("stripe_verified_at", sa.DateTime(), nullable=True),
        sa.Column("evidence_checklist", sa.JSON(), nullable=True),
        sa.Column("evidence_media", sa.JSON(), nullable=True),
        sa.Column("evidence_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("rejected_reason", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_avr_subject_type", "account_verification_requests", ["subject_type"])
    op.create_index("ix_avr_business_id", "account_verification_requests", ["business_id"])
    op.create_index("ix_avr_platform_id", "account_verification_requests", ["platform_id"])
    op.create_index("ix_avr_status", "account_verification_requests", ["status"])


def downgrade():
    op.drop_index("ix_avr_status", table_name="account_verification_requests")
    op.drop_index("ix_avr_platform_id", table_name="account_verification_requests")
    op.drop_index("ix_avr_business_id", table_name="account_verification_requests")
    op.drop_index("ix_avr_subject_type", table_name="account_verification_requests")
    op.drop_table("account_verification_requests")
    op.drop_index("ix_businesses_stripe_account_id", table_name="businesses")
    op.drop_index("ix_businesses_owner_id", table_name="businesses")
    op.drop_table("businesses")
