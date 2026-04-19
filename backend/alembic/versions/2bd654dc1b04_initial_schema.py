"""initial_schema

Revision ID: 2bd654dc1b04
Revises: 
Create Date: 2026-04-18 21:01:17.594965

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.models.base import Base
from app.models import user, client, product, order, payment, logistics, lot, voucher_intake


# revision identifiers, used by Alembic.
revision: str = '2bd654dc1b04'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind, checkfirst=True)
