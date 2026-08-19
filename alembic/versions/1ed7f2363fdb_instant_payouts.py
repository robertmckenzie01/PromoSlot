"""instant payouts: opt-in on connected_accounts, per-deal instant payout record

Revision ID: 1ed7f2363fdb
Revises: c4a91e6f2b58

Additive only.
  - connected_accounts.instant_payout_opt_in: the platform owner's standing
    preference ("always pay me instantly when eligible"). Defaults false —
    nobody is opted in until they explicitly choose it, and eligibility is
    always re-checked live against Stripe before ever acting on this flag.
  - deals.instant_payout_id / instant_net_amount / instant_requested_at: set
    only once a deal's payout was actually converted to a real Stripe Instant
    Payout (classic Payout.create(method="instant")), on top of the existing
    Transfer into the owner's balance. NULL means "standard scheduled payout",
    same as it always was. Never touches deal.paid_at/status — instant payout
    is a delivery-speed detail of an already-PAID deal, not a new deal state.
"""
import sqlalchemy as sa
from alembic import op

revision = "1ed7f2363fdb"
down_revision = "c4a91e6f2b58"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "connected_accounts",
        sa.Column("instant_payout_opt_in", sa.Boolean(), nullable=False,
                  server_default=sa.false()),
    )
    op.add_column("deals", sa.Column("instant_payout_id", sa.String(), nullable=True))
    op.add_column("deals", sa.Column("instant_net_amount", sa.Integer(), nullable=True))
    op.add_column("deals", sa.Column("instant_requested_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("deals", "instant_requested_at")
    op.drop_column("deals", "instant_net_amount")
    op.drop_column("deals", "instant_payout_id")
    op.drop_column("connected_accounts", "instant_payout_opt_in")
