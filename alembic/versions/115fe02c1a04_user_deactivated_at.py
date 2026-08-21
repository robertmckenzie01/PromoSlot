"""user account deactivation: deactivated_at on users

Revision ID: 115fe02c1a04
Revises: 7b3e9a1c5f02

Additive only: a single nullable timestamp marking that the account has been
paused by its own owner. Distinct from deleted_at (permanent, scrubs
personal data) and suspended_at (an admin's misconduct call) — deactivation
is the person's own reversible choice, and nothing about the row changes
except this flag. See backend/account_deactivation.py for the deactivate/
reactivate logic and backend/routers/auth.py's login() for how a correct
password automatically clears it again.
"""
import sqlalchemy as sa
from alembic import op

revision = "115fe02c1a04"
down_revision = "7b3e9a1c5f02"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("deactivated_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("users", "deactivated_at")
