"""timed suspensions: suspended_until on users, platforms, campaigns

Revision ID: e5c8a34f19d2
Revises: d4b71e6c05a9

Additive only — a nullable sibling to the existing suspended_at/suspended_reason
on all three tables. Nothing to backfill: every existing suspension is
indefinite, which is exactly what NULL means here. Downgrade drops the columns
and loses only the expiry timestamps; the suspensions themselves survive.
"""
import sqlalchemy as sa
from alembic import op

revision = "e5c8a34f19d2"
down_revision = "d4b71e6c05a9"
branch_labels = None
depends_on = None

_TABLES = ("users", "platforms", "campaigns")


def upgrade():
    for t in _TABLES:
        op.add_column(t, sa.Column("suspended_until", sa.DateTime(), nullable=True))


def downgrade():
    for t in _TABLES:
        op.drop_column(t, "suspended_until")
