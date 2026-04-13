from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


VOUCHER_INTAKE_COLUMNS = {
    "processing_status": "VARCHAR(32) NOT NULL DEFAULT 'queued'",
    "processing_error": "TEXT NULL",
    "processing_started_at": "TIMESTAMP WITH TIME ZONE NULL",
    "processing_finished_at": "TIMESTAMP WITH TIME ZONE NULL",
    "processing_attempts": "INTEGER NOT NULL DEFAULT 0",
}


def ensure_voucher_intake_processing_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    if "voucher_intakes" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("voucher_intakes")}
    missing_columns = {
        column_name: column_sql
        for column_name, column_sql in VOUCHER_INTAKE_COLUMNS.items()
        if column_name not in existing_columns
    }

    if not missing_columns:
        return

    with engine.begin() as connection:
        for column_name, column_sql in missing_columns.items():
            connection.execute(text(f"ALTER TABLE voucher_intakes ADD COLUMN IF NOT EXISTS {column_name} {column_sql}"))

        # Backfill básicos para que los registros existentes no queden sin estado.
        connection.execute(
            text(
                """
                UPDATE voucher_intakes
                SET processing_status = COALESCE(
                    processing_status,
                    CASE
                        WHEN ocr_raw_text = '[PENDING_PROCESSING]' THEN 'queued'
                        WHEN ocr_raw_text = '[ERROR] Archivo de comprobante no encontrado' THEN 'failed'
                        ELSE 'processed'
                    END
                ),
                    processing_attempts = COALESCE(processing_attempts, 0)
                """
            )
        )
