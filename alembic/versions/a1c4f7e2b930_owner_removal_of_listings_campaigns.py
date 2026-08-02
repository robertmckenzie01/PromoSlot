"""owner removal of listings and campaigns

Adds removed_at to platforms and campaigns. This is the owner's own "remove"
action and is deliberately separate from suspended_at, which is admin
moderation: mixing them would put self-removed rows in the Super-Admin's
suspended queue and let an owner undo an admin suspension.

Revision ID: a1c4f7e2b930
Revises: 506a44f61f0d
"""
import sqlalchemy as sa
from alembic import op

revision = "a1c4f7e2b930"
down_revision = "506a44f61f0d"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("platforms", sa.Column("removed_at", sa.DateTime(), nullable=True))
    op.add_column("campaigns", sa.Column("removed_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("campaigns", "removed_at")
    op.drop_column("platforms", "removed_at")
