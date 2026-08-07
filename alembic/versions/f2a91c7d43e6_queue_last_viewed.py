"""per-admin last-viewed timestamps for shared queues (review/payouts/support)

Revision ID: f2a91c7d43e6
Revises: e5c8a34f19d2

Additive and nullable. NULL means "this admin has never opened that queue",
which is exactly the state a brand-new reviewer should be in — anything
outstanding then counts as new to them. Nothing to backfill.

Downgrade drops the column, which only forgets who has looked at what; every
queue's actual contents live elsewhere and are untouched.
"""
import sqlalchemy as sa
from alembic import op

revision = "f2a91c7d43e6"
down_revision = "e5c8a34f19d2"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("queue_last_viewed_at", sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table("users") as b:
        b.drop_column("queue_last_viewed_at")
