"""email verification: verified_at + token table (backfills existing users)

Revision ID: c8f3a91d2b47
Revises: b7d2e4c19f83

!!! THE BACKFILL BELOW IS LOAD-BEARING !!!

Login is gated on verified_at being set. Adding this column without filling it
in would leave EVERY existing account unverified the instant this deploys —
including the super-admin accounts — locking everyone out of the live site with
no way back in, because the person who would fix it is locked out too.

So: every row that exists at migration time is marked verified, using its own
created_at (falling back to now for any row missing one). Only accounts created
AFTER this migration runs start out unverified, which is the intent.

The downgrade drops the column entirely, which is safe: with no column there is
nothing to gate on.
"""
import sqlalchemy as sa
from alembic import op

revision = "c8f3a91d2b47"
down_revision = "b7d2e4c19f83"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("verified_at", sa.DateTime(), nullable=True))

    # Backfill BEFORE anything can read the column. Existing users predate
    # verification and must not be locked out by its introduction.
    users = sa.table("users",
                     sa.column("verified_at", sa.DateTime),
                     sa.column("created_at", sa.DateTime))
    op.execute(
        users.update()
        .where(users.c.verified_at.is_(None))
        .values(verified_at=sa.func.coalesce(users.c.created_at, sa.func.now()))
    )

    op.create_table(
        "email_verification_tokens",
        sa.Column("token", sa.String(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_email_verification_tokens_user_id",
                    "email_verification_tokens", ["user_id"])


def downgrade():
    op.drop_table("email_verification_tokens")
    op.drop_column("users", "verified_at")
