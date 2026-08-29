"""affiliate marketplace: programs, applications, codes, conversions

Four new tables backing a real (not mocked) affiliate marketplace — see the
module-level docstring above AffiliateProgram in backend/models.py for the
full product spec this was built from (Rob, 2026-08-29).

  - affiliate_programs: a business's pool-funded program. Has a real
    campaign_duration_days/starts_at/ends_at window (settlement happens
    once, after campaign_ends_at + holding_period_days) — same shape as
    Deal's existing per_view/per_impression pool settlement.
  - affiliate_applications: a platform owner's request to join. Pending
    until the business reviews it — never auto-approved.
  - affiliate_codes: the REAL discount code the business created on their
    own store, entered at approval time. Never PromoSlot-generated.
  - affiliate_conversions: one tracked sale, only ever created by a
    signature-verified webhook or the fallback tracking snippet — never
    self-reported by the platform owner.

Revision ID: db734b363ec1
Revises: 86d65b48fc2b
"""
import sqlalchemy as sa
from alembic import op

revision = "db734b363ec1"
down_revision = "86d65b48fc2b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "affiliate_programs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("business_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("commission_type", sa.String(), nullable=False),
        sa.Column("commission_rate", sa.Integer(), nullable=False),
        sa.Column("funding_fee_percent", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("payout_fee_percent", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("holding_period_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("currency", sa.String(), nullable=False, server_default="gbp"),
        sa.Column("pool_max_budget", sa.Integer(), nullable=False),
        sa.Column("pool_committed_amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pool_released_amount", sa.Integer(), nullable=True),
        sa.Column("pool_refunded_amount", sa.Integer(), nullable=True),
        sa.Column("pool_settled_at", sa.DateTime(), nullable=True),
        sa.Column("campaign_duration_days", sa.Integer(), nullable=False),
        sa.Column("campaign_starts_at", sa.DateTime(), nullable=True),
        sa.Column("campaign_ends_at", sa.DateTime(), nullable=True),
        sa.Column("host", sa.String(), nullable=True),
        sa.Column("tracking_confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("webhook_secret", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("payment_intent_id", sa.String(), nullable=True),
        sa.Column("charge_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_affprog_business_id", "affiliate_programs", ["business_id"])
    op.create_index("ix_affprog_status", "affiliate_programs", ["status"])
    op.create_index("ix_affprog_payment_intent_id", "affiliate_programs", ["payment_intent_id"])

    op.create_table(
        "affiliate_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("program_id", sa.Integer(), sa.ForeignKey("affiliate_programs.id"), nullable=False),
        sa.Column("platform_owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("rejected_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_affapp_program_id", "affiliate_applications", ["program_id"])
    op.create_index("ix_affapp_platform_owner_id", "affiliate_applications", ["platform_owner_id"])
    op.create_index("ix_affapp_status", "affiliate_applications", ["status"])

    op.create_table(
        "affiliate_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("program_id", sa.Integer(), sa.ForeignKey("affiliate_programs.id"), nullable=False),
        sa.Column("platform_owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("affiliate_applications.id"), nullable=False, unique=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("removed_reason", sa.Text(), nullable=True),
        sa.Column("removed_message", sa.Text(), nullable=True),
        sa.Column("removed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("removed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_affcode_program_id", "affiliate_codes", ["program_id"])
    op.create_index("ix_affcode_platform_owner_id", "affiliate_codes", ["platform_owner_id"])
    op.create_index("ix_affcode_code", "affiliate_codes", ["code"])

    op.create_table(
        "affiliate_conversions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("program_id", sa.Integer(), sa.ForeignKey("affiliate_programs.id"), nullable=False),
        sa.Column("code_id", sa.Integer(), sa.ForeignKey("affiliate_codes.id"), nullable=False),
        sa.Column("external_order_ref", sa.String(), nullable=True),
        sa.Column("sale_amount", sa.Integer(), nullable=False),
        sa.Column("commission_amount", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("reversed_reason", sa.String(), nullable=True),
        sa.Column("reversed_at", sa.DateTime(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("reported_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_affconv_program_id", "affiliate_conversions", ["program_id"])
    op.create_index("ix_affconv_code_id", "affiliate_conversions", ["code_id"])
    op.create_index("ix_affconv_status", "affiliate_conversions", ["status"])
    op.create_index("ix_affconv_external_order_ref", "affiliate_conversions", ["external_order_ref"])


def downgrade():
    op.drop_index("ix_affconv_external_order_ref", table_name="affiliate_conversions")
    op.drop_index("ix_affconv_status", table_name="affiliate_conversions")
    op.drop_index("ix_affconv_code_id", table_name="affiliate_conversions")
    op.drop_index("ix_affconv_program_id", table_name="affiliate_conversions")
    op.drop_table("affiliate_conversions")

    op.drop_index("ix_affcode_code", table_name="affiliate_codes")
    op.drop_index("ix_affcode_platform_owner_id", table_name="affiliate_codes")
    op.drop_index("ix_affcode_program_id", table_name="affiliate_codes")
    op.drop_table("affiliate_codes")

    op.drop_index("ix_affapp_status", table_name="affiliate_applications")
    op.drop_index("ix_affapp_platform_owner_id", table_name="affiliate_applications")
    op.drop_index("ix_affapp_program_id", table_name="affiliate_applications")
    op.drop_table("affiliate_applications")

    op.drop_index("ix_affprog_payment_intent_id", table_name="affiliate_programs")
    op.drop_index("ix_affprog_status", table_name="affiliate_programs")
    op.drop_index("ix_affprog_business_id", table_name="affiliate_programs")
    op.drop_table("affiliate_programs")
