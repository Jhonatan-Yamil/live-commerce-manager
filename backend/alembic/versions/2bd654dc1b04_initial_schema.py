from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '2bd654dc1b04'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    bind.execute(sa.text("""
        DO $$ BEGIN CREATE TYPE deliverytype AS ENUM ('pickup','shipping','coordinated');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN CREATE TYPE deliverystatus AS ENUM ('in_store','sent','delivered','failed');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN CREATE TYPE deliveryschedulestatus AS ENUM ('scheduled','delivered','not_delivered','rescheduled');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN CREATE TYPE vouchersourcechannel AS ENUM ('manual','telegram','whatsapp');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN CREATE TYPE vouchermatchstatus AS ENUM ('pending','suggested','confirmed','rejected');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))

    from app.models.base import Base
    from app.models import user, client, product, order, payment, logistics, lot, voucher_intake
    from app.models import delivery_schedule

    for table in Base.metadata.sorted_tables:
        table.create(bind=bind, checkfirst=True)

    # Campos adicionales de clients
    bind.execute(sa.text("""
        ALTER TABLE clients
            ADD COLUMN IF NOT EXISTS delivery_city VARCHAR,
            ADD COLUMN IF NOT EXISTS delivery_department VARCHAR;
    """))

    # Campos adicionales de users
    bind.execute(sa.text("""
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS logo_path VARCHAR;
    """))

    # Campos adicionales de delivery_schedules (para separar same_city vs other_city)
    bind.execute(sa.text("""
        ALTER TABLE delivery_schedules
            ADD COLUMN IF NOT EXISTS location TEXT,
            ADD COLUMN IF NOT EXISTS destination_city TEXT;
    """))


def downgrade() -> None:
    bind = op.get_bind()

    from app.models.base import Base
    from app.models import user, client, product, order, payment, logistics, lot, voucher_intake
    from app.models import delivery_schedule

    for table in reversed(Base.metadata.sorted_tables):
        table.drop(bind=bind, checkfirst=True)

    bind.execute(sa.text("DROP TYPE IF EXISTS deliveryschedulestatus"))
    bind.execute(sa.text("DROP TYPE IF EXISTS deliverystatus"))
    bind.execute(sa.text("DROP TYPE IF EXISTS deliverytype"))
    bind.execute(sa.text("DROP TYPE IF EXISTS vouchersourcechannel"))
    bind.execute(sa.text("DROP TYPE IF EXISTS vouchermatchstatus"))