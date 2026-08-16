"""rename Twitch platform_type to Livestream

Revision ID: 317dac98a17b
Revises: ba9360b5b6a3

The "Twitch" entry in the frontend's platform taxonomy was renamed to the
broader "Livestream" (covers Twitch, Kick and other live-streaming
platforms) so businesses aren't limited to thinking about one brand. Any
existing platform-owner listing already saved with platform_type "Twitch"
needs to move to the new identifier too, or it would stop matching the
frontend's platform metadata (broken icon/colour, falls out of filters).

Pure data migration — no schema change. Idempotent: re-running only touches
rows still tagged "Twitch".

Downgrade reverses the rename, in case the frontend change is ever rolled
back.
"""
from alembic import op

revision = "317dac98a17b"
down_revision = "ba9360b5b6a3"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE platforms SET platform_type = 'Livestream' WHERE platform_type = 'Twitch'")


def downgrade():
    op.execute("UPDATE platforms SET platform_type = 'Twitch' WHERE platform_type = 'Livestream'")
