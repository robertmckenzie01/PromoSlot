"""chargeback disputes: disputes + dispute_events tables, deal dispute fields

Adds real Stripe chargeback tracking (charge.dispute.* webhook events):
  - disputes: one row per Stripe dispute id, admin-only detail (reason code,
    evidence deadline, payout-impact flag, shared-queue assignment).
  - dispute_events: the admin-only timeline on a dispute (system log entries,
    internal notes, "request information" asks to a party).
  - deals.dispute_status: denormalised read of the most recent dispute's raw
    Stripe status, so deal views can show a read-only "payment dispute under
    review" badge without a join.
  - deals.status_before_dispute: the DealStatus an UNPAID deal was frozen from
    when a dispute opened, so a won/withdrawn outcome can restore it exactly.
    Never set for an already-PAID deal — PAID stays terminal either way.

batch_alter_table is used for the new deals columns for the same reason as
b7d2e4c19f83 (SQLite can't ALTER to add columns/FKs directly; Postgres gets a
plain ALTER either way).

Revision ID: c4a91e6f2b58
Revises: 317dac98a17b
"""
import sqlalchemy as sa
from alembic import op

revision = "c4a91e6f2b58"
down_revision = "317dac98a17b"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("deals") as b:
        b.add_column(sa.Column("dispute_status", sa.String(), nullable=True))
        b.add_column(sa.Column("status_before_dispute", sa.String(), nullable=True))

    op.create_table(
        "disputes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("deal_id", sa.Integer(), sa.ForeignKey("deals.id"), nullable=False),
        sa.Column("stripe_dispute_id", sa.String(), nullable=False, unique=True),
        sa.Column("charge_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="gbp"),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("evidence_due_by", sa.DateTime(), nullable=True),
        sa.Column("payout_already_released", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("deal_status_before", sa.String(), nullable=True),
        sa.Column("outcome", sa.String(), nullable=True),
        sa.Column("opened_at", sa.DateTime(), nullable=False),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("funds_withdrawn_at", sa.DateTime(), nullable=True),
        sa.Column("funds_reinstated_at", sa.DateTime(), nullable=True),
        sa.Column("assigned_to_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("claimed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_disputes_deal_id", "disputes", ["deal_id"])
    op.create_index("ix_disputes_stripe_dispute_id", "disputes", ["stripe_dispute_id"], unique=True)
    op.create_index("ix_disputes_charge_id", "disputes", ["charge_id"])
    op.create_index("ix_disputes_assigned_to_id", "disputes", ["assigned_to_id"])

    op.create_table(
        "dispute_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dispute_id", sa.Integer(), sa.ForeignKey("disputes.id"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("target_party", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_dispute_events_dispute_id", "dispute_events", ["dispute_id"])
    op.create_index("ix_dispute_events_author_id", "dispute_events", ["author_id"])


def downgrade():
    op.drop_table("dispute_events")
    op.drop_index("ix_disputes_assigned_to_id", table_name="disputes")
    op.drop_index("ix_disputes_charge_id", table_name="disputes")
    op.drop_index("ix_disputes_stripe_dispute_id", table_name="disputes")
    op.drop_index("ix_disputes_deal_id", table_name="disputes")
    op.drop_table("disputes")
    with op.batch_alter_table("deals") as b:
        b.drop_column("status_before_dispute")
        b.drop_column("dispute_status")
