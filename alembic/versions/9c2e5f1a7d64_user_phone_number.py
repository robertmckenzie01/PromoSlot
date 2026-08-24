"""user phone number (private, emergency-contact only)

Revision ID: 9c2e5f1a7d64
Revises: 5685bc99df3c
Create Date: 2026-08-24 00:00:00.000000

Additive, nullable — no existing user is affected. See the User.phone
comment in models.py: private, never returned from any public/other-party
endpoint, used only as an optional emergency-contact channel (e.g. an open
proof-update grace period on a per_view/per_impression deal).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9c2e5f1a7d64'
down_revision: Union[str, Sequence[str], None] = '5685bc99df3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('phone', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('phone')
