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
        DO $$ BEGIN CREATE TYPE vouchermatchstatus AS ENUM ('pending','suggested','confirmed','rejected','ignored');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))

    from app.models.base import Base
    from app.models import user, client, product, order, payment, logistics, lot, voucher_intake
    from app.models import delivery_schedule

    for table in Base.metadata.sorted_tables:
        table.create(bind=bind, checkfirst=True)

    bind.execute(sa.text("""
        ALTER TABLE clients
            ADD COLUMN IF NOT EXISTS delivery_city VARCHAR,
            ADD COLUMN IF NOT EXISTS delivery_department VARCHAR,
            ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR,
            ADD COLUMN IF NOT EXISTS delivery_transport_companies JSONB;
    """))

    bind.execute(sa.text("""
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS logo_path VARCHAR;
    """))

    bind.execute(sa.text("""
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS whatsapp_instance_name VARCHAR,
            ADD COLUMN IF NOT EXISTS whatsapp_instance_status VARCHAR,
            ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS whatsapp_intake_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    """))

    bind.execute(sa.text("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_users_whatsapp_instance_name
        ON users (whatsapp_instance_name);
    """))

    bind.execute(sa.text("""
        ALTER TABLE voucher_intakes
            ADD COLUMN IF NOT EXISTS source_instance_name VARCHAR,
            ADD COLUMN IF NOT EXISTS source_caption VARCHAR;
    """))

    bind.execute(sa.text("""
        ALTER TABLE delivery_schedules
            ADD COLUMN IF NOT EXISTS location TEXT,
            ADD COLUMN IF NOT EXISTS destination_city TEXT,
            ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR,
            ADD COLUMN IF NOT EXISTS transport_companies JSONB;
    """))

    # Add tenant scoping columns (nullable) and indexes/constraints
    bind.execute(sa.text("""
        ALTER TABLE clients
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_clients_user_id ON clients (user_id);
    """))
    bind.execute(sa.text("""
        ALTER TABLE products
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_products_user_id ON products (user_id);
    """))
    bind.execute(sa.text("""
        ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_orders_user_id ON orders (user_id);
    """))
    bind.execute(sa.text("""
        ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_payments_user_id ON payments (user_id);
    """))
    bind.execute(sa.text("""
        ALTER TABLE lots
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_lots_user_id ON lots (user_id);
    """))
    bind.execute(sa.text("""
        ALTER TABLE logistics
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_logistics_user_id ON logistics (user_id);
    """))
    bind.execute(sa.text("""
        ALTER TABLE delivery_schedules
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_delivery_schedules_user_id ON delivery_schedules (user_id);
    """))
    bind.execute(sa.text("""
        ALTER TABLE voucher_intakes
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """))
    bind.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_voucher_intakes_user_id ON voucher_intakes (user_id);
    """))

    # Add FK constraints (create only if target exists)
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE clients ADD CONSTRAINT fk_clients_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE products ADD CONSTRAINT fk_products_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE payments ADD CONSTRAINT fk_payments_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE lots ADD CONSTRAINT fk_lots_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE logistics ADD CONSTRAINT fk_logistics_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE delivery_schedules ADD CONSTRAINT fk_delivery_schedules_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """))
    bind.execute(sa.text("""
        DO $$ BEGIN ALTER TABLE voucher_intakes ADD CONSTRAINT fk_voucher_intakes_user_id_users FOREIGN KEY (user_id) REFERENCES users(id);
        EXCEPTION WHEN duplicate_object THEN null; END $$;
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

    bind.execute(sa.text("""
        ALTER TABLE voucher_intakes
            DROP COLUMN IF EXISTS source_instance_name,
            DROP COLUMN IF EXISTS source_caption;
    """))

    bind.execute(sa.text("DROP INDEX IF EXISTS ix_users_whatsapp_instance_name"))

    bind.execute(sa.text("""
        ALTER TABLE users
            DROP COLUMN IF EXISTS whatsapp_instance_name,
            DROP COLUMN IF EXISTS whatsapp_instance_status,
            DROP COLUMN IF EXISTS whatsapp_connected_at,
            DROP COLUMN IF EXISTS whatsapp_intake_enabled;
    """))
