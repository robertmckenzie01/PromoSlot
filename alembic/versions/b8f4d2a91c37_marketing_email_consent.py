"""marketing email consent (opt-in system)

Revision ID: b8f4d2a91c37
Revises: 9c2e5f1a7d64
Create Date: 2026-08-25 00:00:00.000000

Additive. marketing_opt_in defaults false for every row, including every
existing user — PECR requires treating anyone who hasn't actively said yes
as opted-out, there's no compliant alternative default. marketing_opt_in_at
and marketing_opt_in_source stay null until a real opt-in happens once (see
User model comment in models.py).

Also adds marketing_opt_tokens, the one-click token table backing opt-in
invite links (in transactional emails) and future unsubscribe links (in
marketing emails) — same shape as password_reset_tokens /
email_verification_tokens, except expires_at is nullable so an unsubscribe
link can be issued that never goes stale.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8f4d2a91c37'
down_revision: Union[str, Sequence[str], None] = '9c2e5f1a7d64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('marketing_opt_in', sa.Boolean(), nullable=False,
                                      server_default=sa.false()))
        batch_op.add_column(sa.Column('marketing_opt_in_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('marketing_opt_in_source', sa.String(), nullable=True))

    op.create_table(
        'marketing_opt_tokens',
        sa.Column('token', sa.String(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('purpose', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_marketing_opt_tokens_user_id', 'marketing_opt_tokens', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_marketing_opt_tokens_user_id', table_name='marketing_opt_tokens')
    op.drop_table('marketing_opt_tokens')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('marketing_opt_in_source')
        batch_op.drop_column('marketing_opt_in_at')
        batch_op.drop_column('marketing_opt_in')
