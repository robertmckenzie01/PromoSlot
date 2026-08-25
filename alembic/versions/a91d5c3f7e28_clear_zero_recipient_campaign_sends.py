"""clear zero-recipient marketing_campaign_sends rows

Revision ID: a91d5c3f7e28
Revises: f3a7c1e94b02
Create Date: 2026-08-25 00:00:00.000000

Data-only cleanup, no schema change. Before this migration,
marketing.send_campaign_now() would record a campaign as permanently sent
even when recipient_count was 0 (no opted-in users at all yet — expected
pre-launch, not a failure). That code path is now fixed (see marketing.py),
but the very first real production trigger ran under the old logic and
left a stray "receipts-relationships-not-reach" row with recipient_count=0,
which would otherwise retire that campaign forever without it ever having
reached a real person. Deleting any such zero-recipient row puts those
campaigns back in the pending queue for next_campaign() to pick up again.

Not reversible in any meaningful way (there's nothing to restore — these
rows represented sends that never actually happened), so downgrade is a
no-op.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a91d5c3f7e28'
down_revision: Union[str, Sequence[str], None] = 'f3a7c1e94b02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("DELETE FROM marketing_campaign_sends WHERE recipient_count = 0"))


def downgrade() -> None:
    pass
