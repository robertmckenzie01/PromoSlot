"""affiliate marketplace: pool top-ups

A business adding more budget to an already-funded/live program. Its own
table rather than reusing AffiliateProgram.payment_intent_id, since that
column already holds the ORIGINAL funding PaymentIntent — a program can be
topped up more than once over a campaign, so each top-up needs its own row
and its own PaymentIntent to be tracked to completion by the
payment_intent.succeeded webhook (see services.mark_affiliate_topup_funded_
from_pi), exactly like the original funding flow.

Revision ID: a7c3e91b5f08
Revises: f1a2c9b7e3d4
"""
import sqlalchemy as sa
from alembic import op

revision = "a7c3e91b5f08"
down_revision = "f1a2c9b7e3d4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "affiliate_topups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("program_id", sa.Integer(), sa.ForeignKey("affiliate_programs.id"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),   # pence, principal added to the pool (excludes funding fee)
        sa.Column("funding_fee_percent", sa.Integer(), nullable=False),  # locked from the program at request time
        sa.Column("payment_intent_id", sa.String(), index=True),
        sa.Column("charge_id", sa.String()),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),  # pending | funded
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("funded_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_afftopup_program_id", "affiliate_topups", ["program_id"])
    op.create_index("ix_afftopup_payment_intent_id", "affiliate_topups", ["payment_intent_id"])
    op.create_index("ix_afftopup_status", "affiliate_topups", ["status"])


def downgrade():
    op.drop_index("ix_afftopup_status", table_name="affiliate_topups")
    op.drop_index("ix_afftopup_payment_intent_id", table_name="affiliate_topups")
    op.drop_index("ix_afftopup_program_id", table_name="affiliate_topups")
    op.drop_table("affiliate_topups")
