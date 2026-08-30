"""Google OAuth sign-in

Adds User.google_sub — Google's stable per-account identifier (the OIDC
"sub" claim), used to link a Google identity to a PromoSlot account.
Deliberately NOT the join key on its own: first Google login for an email
that already has a password account links by email (see
routers/google_auth.py), then backfills google_sub here so every
subsequent login is a fast, unambiguous lookup rather than a repeated
email match. Nullable + unique: most existing accounts have none, and no
two accounts may ever claim the same Google identity.

google_pending_signups is the short-lived bridge for a BRAND NEW Google
identity that has no matching PromoSlot account yet — role selection
(business/platform-owner/both, display name(s)) still has to happen
before a real User row is created, exactly like the ordinary signup form
requires it (see task #21). One row per pending signup, single-use,
expires quickly (long enough to fill in the role-selection screen, short
enough not to become a lingering, forgotten table) — same token-row shape
as EmailVerificationToken/PasswordResetToken/MarketingOptToken.

Revision ID: e2c8a49f1b73
Revises: a7c3e91b5f08
"""
import sqlalchemy as sa
from alembic import op

revision = "e2c8a49f1b73"
down_revision = "a7c3e91b5f08"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("google_sub", sa.String(), nullable=True))
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)

    op.create_table(
        "google_pending_signups",
        sa.Column("token", sa.String(), primary_key=True),
        sa.Column("google_sub", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_googlepending_google_sub", "google_pending_signups", ["google_sub"])


def downgrade():
    op.drop_index("ix_googlepending_google_sub", table_name="google_pending_signups")
    op.drop_table("google_pending_signups")
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_column("users", "google_sub")
