"""campaign_duration_days on deals

Revision ID: 5685bc99df3c
Revises: 8bac227b0478
Create Date: 2026-08-24 00:00:00.000000

Additive, nullable — no existing deal is affected. Collected at deal
creation for a per_view/per_impression (or hybrid) deal instead of
absolute start/end dates, since a deal can sit unfunded for days after
creation (pending approval, pending payment) and the campaign clock
should only start once money is actually in escrow. See the
Deal.campaign_duration_days comment in models.py.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5685bc99df3c'
down_revision: Union[str, Sequence[str], None] = '8bac227b0478'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('deals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('campaign_duration_days', sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('deals', schema=None) as batch_op:
        batch_op.drop_column('campaign_duration_days')
