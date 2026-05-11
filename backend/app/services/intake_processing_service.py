from __future__ import annotations

import os
from datetime import datetime, timezone

from app.database.session import SessionLocal
from app.repositories import voucher_intake_repository
from app.services.ocr_service import extract_voucher_fields
from app.services.voucher_intake_service import UPLOAD_DIR, attempt_match_intake


def process_intake_job(intake_id: int) -> None:
    db = SessionLocal()
    try:
        intake = voucher_intake_repository.get_by_id(db, intake_id)
        if not intake:
            return

        intake.processing_status = "processing"
        intake.processing_started_at = datetime.now(timezone.utc)
        intake.processing_error = None
        voucher_intake_repository.save(db, intake)

        filepath = os.path.join(UPLOAD_DIR, intake.file_path)
        if not os.path.exists(filepath):
            intake.ocr_raw_text = "[ERROR] Archivo de comprobante no encontrado"
            intake.ocr_confidence = 0
            intake.processing_status = "failed"
            intake.processing_error = "Archivo de comprobante no encontrado"
            intake.processing_finished_at = datetime.now(timezone.utc)
            voucher_intake_repository.save(db, intake)
            return

        ocr_fields = extract_voucher_fields(filepath)
        intake.extracted_amount = ocr_fields.get("extracted_amount")
        intake.extracted_date = ocr_fields.get("extracted_date")
        intake.extracted_reference = ocr_fields.get("extracted_reference")
        intake.extracted_sender_name = ocr_fields.get("extracted_sender_name")
        intake.ocr_raw_text = ocr_fields.get("ocr_raw_text")
        intake.ocr_confidence = ocr_fields.get("ocr_confidence")
        intake.processing_status = "processed"
        intake.processing_finished_at = datetime.now(timezone.utc)

        voucher_intake_repository.save(db, intake)
        attempt_match_intake(db, intake.id)
    except Exception as exc:
        intake = voucher_intake_repository.get_by_id(db, intake_id)
        if intake:
            intake.processing_status = "failed"
            intake.processing_error = str(exc)
            intake.processing_finished_at = datetime.now(timezone.utc)
            voucher_intake_repository.save(db, intake)
        raise
    finally:
        db.close()
