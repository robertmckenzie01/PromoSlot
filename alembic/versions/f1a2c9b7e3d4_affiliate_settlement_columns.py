"""affiliate settlement: refund tracking + per-owner payout tracking

Two additions needed for campaign-end settlement (see services.py's
settle_affiliate_program):

  - affiliate_programs.refund_id: the one Stripe Refund of unused pool
    budget back to the business, same shape as Deal.refund_id. There is
    exactly one per program (one settlement event), unlike payouts.

  - affiliate_codes.payout_transfer_id/payout_net_amount/payout_at: a
    program can have MANY platform owners, each getting their OWN Stripe
    Transfer at settlement — unlike Deal (always exactly one owner), so
    this can't reuse the single transfer_id column pattern Deal uses.
    AffiliateCode is the right place: it's already the one-row-per-owner-
    per-program relationship. Deliberately NOT reusing the `transfers`
    table, whose deal_id column is NOT NULL (deal-only bookkeeping, same
    reason Payment wasn't reused for pool funding — see routers/affiliate.py
    fund_program's comment).

Revision ID: f1a2c9b7e3d4
Revises: db734b363ec1
"""
import sqlalchemy as sa
from alembic import op

revision = "f1a2c9b7e3d4"
down_revision = "db734b363ec1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("affiliate_programs", sa.Column("refund_id", sa.String(), nullable=True))
    op.add_column("affiliate_codes", sa.Column("payout_transfer_id", sa.String(), nullable=True))
    op.add_column("affiliate_codes", sa.Column("payout_net_amount", sa.Integer(), nullable=True))
    op.add_column("affiliate_codes", sa.Column("payout_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("affiliate_codes", "payout_at")
    op.drop_column("affiliate_codes", "payout_net_amount")
    op.drop_column("affiliate_codes", "payout_transfer_id")
    op.drop_column("affiliate_programs", "refund_id")
