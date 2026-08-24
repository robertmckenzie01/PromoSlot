"""pooled pricing models: per-view/impression pool + composable hybrid

Revision ID: 8bac227b0478
Revises: c16dac73d659
Create Date: 2026-08-24 00:00:00.000000

Additive only, every new column nullable (or defaulted for existing rows) —
no existing deal's behavior changes. Adds the fields needed for per-view and
per-impression pricing, funded as a pre-paid pool with a single settlement
event at campaign end, instead of the single fixed listed_price every deal
uses today. "hybrid" is deliberately NOT a new pricing_model value — see the
Deal.pricing_model comment in models.py for why: it's just a per_view/
per_impression deal where listed_price is also > 0, so no new deal "type"
needed anywhere, just these fields being used alongside the existing ones.

See models.py's Deal and Verification docstrings/comments for the full
rationale on each field.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8bac227b0478'
down_revision: Union[str, Sequence[str], None] = 'c16dac73d659'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('deals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('pricing_model', sa.String(), nullable=False,
                                       server_default='fixed'))
        batch_op.add_column(sa.Column('rate_unit_pence', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('rate_unit_quantity', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('pool_max_budget', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('campaign_starts_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('campaign_ends_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('pool_released_amount', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('pool_refunded_amount', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('pool_settled_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('proof_grace_deadline', sa.DateTime(), nullable=True))

    # server_default was only needed to backfill existing rows; the model
    # itself supplies the Python-side default for new rows going forward, so
    # drop the server default rather than leave it permanently on the column.
    with op.batch_alter_table('deals', schema=None) as batch_op:
        batch_op.alter_column('pricing_model', server_default=None)

    with op.batch_alter_table('verifications', schema=None) as batch_op:
        batch_op.add_column(sa.Column('verified_quantity', sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('verifications', schema=None) as batch_op:
        batch_op.drop_column('verified_quantity')

    with op.batch_alter_table('deals', schema=None) as batch_op:
        batch_op.drop_column('proof_grace_deadline')
        batch_op.drop_column('pool_settled_at')
        batch_op.drop_column('pool_refunded_amount')
        batch_op.drop_column('pool_released_amount')
        batch_op.drop_column('campaign_ends_at')
        batch_op.drop_column('campaign_starts_at')
        batch_op.drop_column('pool_max_budget')
        batch_op.drop_column('rate_unit_quantity')
        batch_op.drop_column('rate_unit_pence')
        batch_op.drop_column('pricing_model')
