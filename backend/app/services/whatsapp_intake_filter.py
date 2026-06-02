from __future__ import annotations

import re

from app.models.voucher_intake import VoucherSourceChannel


WHATSAPP_KEYWORDS = (
    "comprobante",
    "voucher",
    "transferencia",
    "transferido",
    "deposito",
    "depósito",
    "pago",
    "abono",
    "recibo",
)


def _normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def should_ignore_whatsapp_intake(intake, ocr_fields: dict) -> tuple[bool, str]:
    if intake.source_channel != VoucherSourceChannel.whatsapp:
        return False, ""

    caption = _normalize_text(getattr(intake, "source_caption", None))
    mime_type = _normalize_text(getattr(intake, "mime_type", None))
    file_path = _normalize_text(getattr(intake, "file_path", None))

    if any(keyword in caption for keyword in WHATSAPP_KEYWORDS):
        return False, ""

    if mime_type == "application/pdf" or file_path.endswith(".pdf"):
        return False, ""

    confidence = float(ocr_fields.get("ocr_confidence") or 0)
    amount = ocr_fields.get("extracted_amount")
    if confidence > 0.4:
        return False, ""

    if amount is not None:
        return False, ""

    return True, "Ignorado: no parece comprobante (sin palabras clave, sin PDF y OCR insuficiente)"