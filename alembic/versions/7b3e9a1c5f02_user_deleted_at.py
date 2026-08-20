"""user data deletion: deleted_at on users

Revision ID: 7b3e9a1c5f02
Revises: 1ed7f2363fdb

Additive only: a single nullable timestamp marking that an account's
personal data has been wiped (self-service or by a Super-Admin), distinct
from suspended_at (recoverable, identity-scoped) and banned_at (permanent,
misconduct). Deletion never removes the row itself — deals, reviews and
messages that reference this user's id must keep working for the other
party's record and for accounting/dispute-resolution retention, exactly as
described in the Privacy Policy. What actually happens on deletion is an
anonymisation pass in code (see services.py / routers/profiles.py): email,
display name, bio, links, avatar and intro video are cleared or replaced
with a placeholder, uploaded files are actually removed from storage, and
every session/reset/verification token is revoked. deleted_at is just the
marker that a row has already been through that pass and must be treated
as gone everywhere it's displayed or logged into.
"""
import sqlalchemy as sa
from alembic import op

revision = "7b3e9a1c5f02"
down_revision = "1ed7f2363fdb"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("users", "deleted_at")
