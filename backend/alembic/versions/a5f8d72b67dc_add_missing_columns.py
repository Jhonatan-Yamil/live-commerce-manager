"""add missing columns

Revision ID: a5f8d72b67dc
Revises: 2bd654dc1b04
Create Date: 2026-06-01 11:19:11.210138

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.

revision: str = 'a5f8d72b67dc'
down_revision: Union[str, None] = '2bd654dc1b04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_if_not_exists(table, column, col_type):
    conn = op.get_bind()

    result = conn.execute(
        sa.text(
            f"""
            SELECT 1
            FROM information_schema.columns
            WHERE table_name='{table}'
              AND column_name='{column}'
            """
        )
    )

    if not result.fetchone():
        op.add_column(
            table,
            sa.Column(column, col_type, nullable=True)
        )


def upgrade() -> None:
    _add_if_not_exists(
        'clients',
        'delivery_mode',
        sa.String()
    )

    _add_if_not_exists(
        'clients',
        'delivery_transport_companies',
        sa.JSON()
    )

    _add_if_not_exists(
        'delivery_schedules',
        'delivery_mode',
        sa.String()
    )

    _add_if_not_exists(
        'delivery_schedules',
        'transport_companies',
        sa.JSON()
    )


def downgrade() -> None:
    op.drop_column('delivery_schedules', 'transport_companies')
    op.drop_column('delivery_schedules', 'delivery_mode')
    op.drop_column('clients', 'delivery_transport_companies')
    op.drop_column('clients', 'delivery_mode')