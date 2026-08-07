"""replace TOTP MFA with a static 8-digit action code

Revision ID: d4b71e6c05a9
Revises: c8f3a91d2b47

Drops the authenticator-app columns and adds the action-code ones.

Existing Super-Admins land on action_code_hash = NULL, which is the correct
"not set up yet" state: privileged actions are gated until they set a code,
exactly as the old mfa_enabled check gated them. Normal login is unaffected, so
this is a prompt, not a lockout.

batch_alter_table is used because SQLite cannot ALTER columns in place;
Postgres gets plain ALTERs.
"""
import sqlalchemy as sa
from alembic import op

revision = "d4b71e6c05a9"
down_revision = "c8f3a91d2b47"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("action_code_hash", sa.String(), nullable=True))
        b.add_column(sa.Column("action_code_failed_attempts", sa.Integer(),
                               nullable=False, server_default="0"))
        b.add_column(sa.Column("action_code_locked_until", sa.DateTime(), nullable=True))
        b.drop_column("mfa_recovery_codes")
        b.drop_column("mfa_enabled")
        b.drop_column("mfa_secret")


def downgrade():
    # Restores the MFA columns unset — the secrets themselves are gone for good,
    # so anyone who had MFA would have to re-enrol. mfa_enabled comes back False
    # rather than NULL to satisfy its NOT NULL constraint.
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("mfa_secret", sa.String(), nullable=True))
        b.add_column(sa.Column("mfa_enabled", sa.Boolean(), nullable=False,
                               server_default=sa.false()))
        b.add_column(sa.Column("mfa_recovery_codes", sa.JSON(), nullable=True))
        b.drop_column("action_code_locked_until")
        b.drop_column("action_code_failed_attempts")
        b.drop_column("action_code_hash")
