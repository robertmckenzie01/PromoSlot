"""profile setup viewed

Revision ID: ba9360b5b6a3
Revises: 24c4445e1841

Additive: one nullable timestamp on users, set the first time someone opens
their own account/profile page. Drives the homepage "getting started"
checklist's "set up your public profile" step - NULL means the step is still
open, which is exactly where every existing account should sit (nobody who
already viewed their profile before this shipped gets wrongly nagged, but
nobody gets it marked done for free either). Nothing to backfill.

Downgrade drops the column, which only forgets who has opened their profile
page. No other state depends on it.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba9360b5b6a3'
down_revision: Union[str, Sequence[str], None] = '24c4445e1841'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('profile_setup_viewed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('profile_setup_viewed_at')
