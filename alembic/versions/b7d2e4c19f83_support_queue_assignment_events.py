"""support queue: ticket assignment + event timeline

Adds single-owner assignment to support_tickets and a support_ticket_events
table for replies and reviewer-only internal notes.

batch_alter_table is used for the new columns: SQLite cannot ALTER a table to
add a foreign key, so Alembic rebuilds it copy-and-move there while Postgres
gets a plain ALTER.

Revision ID: b7d2e4c19f83
Revises: a1c4f7e2b930
"""
import sqlalchemy as sa
from alembic import op

revision = "b7d2e4c19f83"
down_revision = "a1c4f7e2b930"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("support_tickets") as b:
        b.add_column(sa.Column("assigned_to_id", sa.Integer(), nullable=True))
        b.add_column(sa.Column("claimed_at", sa.DateTime(), nullable=True))
        b.create_foreign_key("fk_support_tickets_assigned_to_id", "users",
                             ["assigned_to_id"], ["id"])
    op.create_index("ix_support_tickets_assigned_to_id", "support_tickets", ["assigned_to_id"])

    op.create_table(
        "support_ticket_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("support_tickets.id"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_support_ticket_events_ticket_id", "support_ticket_events", ["ticket_id"])
    op.create_index("ix_support_ticket_events_author_id", "support_ticket_events", ["author_id"])


def downgrade():
    op.drop_table("support_ticket_events")
    op.drop_index("ix_support_tickets_assigned_to_id", table_name="support_tickets")
    with op.batch_alter_table("support_tickets") as b:
        b.drop_constraint("fk_support_tickets_assigned_to_id", type_="foreignkey")
        b.drop_column("claimed_at")
        b.drop_column("assigned_to_id")
