"""dual linked identities

Revision ID: 24c4445e1841
Revises: a3f7b21c9e84
Create Date: 2026-08-12 12:53:18.639431

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '24c4445e1841'
down_revision: Union[str, Sequence[str], None] = 'a3f7b21c9e84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the old whole-column unique index — a person's two linked identities
    # now share an email, so global uniqueness is replaced by the two partial
    # indexes below (at most one business identity + one platform-owner
    # identity per email). The column keeps a plain (non-unique) index so
    # find_by_email() stays fast.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('linked_user_id', sa.Integer(), nullable=True))
        batch_op.drop_index(batch_op.f('ix_users_email'))
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=False)
        batch_op.create_foreign_key('fk_users_linked_user_id', 'users', ['linked_user_id'], ['id'])

    # Partial unique indexes can't go inside SQLite batch mode (they're plain
    # CREATE INDEX statements, no table rebuild needed) — created directly.
    # A plain boolean column works as a partial-index predicate as-is on both
    # Postgres and SQLite (0/1 truthy), no need for `= true` vs `= 1`.
    op.create_index('ix_users_email_business_uniq', 'users', ['email'], unique=True,
                    postgresql_where=sa.text('is_business'),
                    sqlite_where=sa.text('is_business'))
    op.create_index('ix_users_email_platform_uniq', 'users', ['email'], unique=True,
                    postgresql_where=sa.text('is_platform_owner'),
                    sqlite_where=sa.text('is_platform_owner'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_users_email_platform_uniq', table_name='users')
    op.drop_index('ix_users_email_business_uniq', table_name='users')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_linked_user_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_users_email'))
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)
        batch_op.drop_column('linked_user_id')
