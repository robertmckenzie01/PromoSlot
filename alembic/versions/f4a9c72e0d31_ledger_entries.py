"""Ledger entries (task #31)

Adds ledger_entries: one row per real, confirmed money movement across the
whole platform (deal charges/payouts/refunds, affiliate program funding/
payouts/refunds, dispute-lost charge reversals), signed from the platform's
own perspective (+ in, - out). Additive only — every existing money table
(Payment, Transfer, Dispute, and the bare amount columns on Deal/
AffiliateProgram/AffiliateCode/AffiliateTopUp) is untouched; this is a
cross-cutting index written alongside them, not a replacement.

Revision ID: f4a9c72e0d31
Revises: e2c8a49f1b73
"""
import sqlalchemy as sa
from alembic import op

revision = "f4a9c72e0d31"
down_revision = "e2c8a49f1b73"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="gbp"),
        sa.Column("deal_id", sa.Integer(), sa.ForeignKey("deals.id"), nullable=True),
        sa.Column("affiliate_program_id", sa.Integer(), sa.ForeignKey("affiliate_programs.id"), nullable=True),
        sa.Column("stripe_ref", sa.String(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_ledger_entries_kind", "ledger_entries", ["kind"])
    op.create_index("ix_ledger_entries_deal_id", "ledger_entries", ["deal_id"])
    op.create_index("ix_ledger_entries_affiliate_program_id", "ledger_entries", ["affiliate_program_id"])
    op.create_index("ix_ledger_entries_stripe_ref", "ledger_entries", ["stripe_ref"])
    op.create_index("ix_ledger_entries_created_at", "ledger_entries", ["created_at"])


def downgrade():
    op.drop_index("ix_ledger_entries_created_at", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_stripe_ref", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_affiliate_program_id", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_deal_id", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_kind", table_name="ledger_entries")
    op.drop_table("ledger_entries")
