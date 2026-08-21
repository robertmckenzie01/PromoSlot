"""banned_emails: persistent ban record independent of the users row

Revision ID: c16dac73d659
Revises: 115fe02c1a04

Additive only: a new standalone table, no changes to any existing column.
See models.py's BannedEmail docstring for why this exists — account
deletion (self-service or admin) scrubs users.email to a placeholder, which
was silently undoing a ban the moment the banned account got deleted. This
table is written by ban_user() and cleared by unban_user() (see
routers/admin.py), and checked at signup (routers/auth.py) independently of
whatever the users row currently says.
"""
import sqlalchemy as sa
from alembic import op

revision = "c16dac73d659"
down_revision = "115fe02c1a04"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "banned_emails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("banned_at", sa.DateTime(), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
    )
    op.create_index("ix_banned_emails_email", "banned_emails", ["email"], unique=True)


def downgrade():
    op.drop_index("ix_banned_emails_email", table_name="banned_emails")
    op.drop_table("banned_emails")
