"""guided product tour state on users

Revision ID: a3f7b21c9e84
Revises: f2a91c7d43e6

Additive. The three timestamps are nullable and all-NULL means "never offered
the tour", which is exactly where an existing account should sit — nobody who
signed up before this shipped should be dragged into onboarding, but the
welcome card is still available to them the first time they land. Nothing to
backfill.

`product_tour_current_step` is NOT NULL with a server default of 0 so existing
rows get a sane value without a data migration; the client treats 0 as "at the
first step".

Downgrade drops the columns, which only forgets who has seen the tour. No other
state depends on them.
"""
import sqlalchemy as sa
from alembic import op

revision = "a3f7b21c9e84"
down_revision = "f2a91c7d43e6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("product_tour_started_at", sa.DateTime(), nullable=True))
        b.add_column(sa.Column("product_tour_completed_at", sa.DateTime(), nullable=True))
        b.add_column(sa.Column("product_tour_skipped_at", sa.DateTime(), nullable=True))
        b.add_column(sa.Column("product_tour_current_step", sa.Integer(),
                               nullable=False, server_default="0"))
        b.add_column(sa.Column("product_tour_version", sa.String(), nullable=True))


def downgrade():
    with op.batch_alter_table("users") as b:
        b.drop_column("product_tour_version")
        b.drop_column("product_tour_current_step")
        b.drop_column("product_tour_skipped_at")
        b.drop_column("product_tour_completed_at")
        b.drop_column("product_tour_started_at")
