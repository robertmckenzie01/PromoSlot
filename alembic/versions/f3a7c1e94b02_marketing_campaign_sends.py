"""marketing campaign sends (batch-send tracking)

Revision ID: f3a7c1e94b02
Revises: b8f4d2a91c37
Create Date: 2026-08-25 00:00:00.000000

New table only, additive. One row per campaign slug that has actually gone
out to every marketing_opt_in user, ever — see MarketingCampaignSend in
models.py and marketing.send_campaign_now() for how this drives which
campaign is "next" and makes repeat triggers of the send endpoint a no-op
once a given slug has already been sent.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f3a7c1e94b02'
down_revision: Union[str, Sequence[str], None] = 'b8f4d2a91c37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'marketing_campaign_sends',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('campaign_slug', sa.String(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=False),
        sa.Column('recipient_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failure_count', sa.Integer(), nullable=False, server_default='0'),
    )
    op.create_index('ix_marketing_campaign_sends_campaign_slug', 'marketing_campaign_sends',
                    ['campaign_slug'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_marketing_campaign_sends_campaign_slug', table_name='marketing_campaign_sends')
    op.drop_table('marketing_campaign_sends')
