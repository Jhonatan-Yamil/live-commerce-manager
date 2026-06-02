from __future__ import annotations

import re
from app.models.voucher_intake import VoucherSourceChannel

# Palabras clave en caption que aprueban inmediatamente
CAPTION_KEYWORDS = (
    "comprobante", "voucher", "transferencia", "transferido",
    "deposito", "depósito", "pago", "abono", "recibo",
    "yape", "plin", "tigo", "tigo money", "billetera",
    "bolivianos", "banco", "qr", "confirmacion", "confirmación",
)

# Patrones OCR — cada grupo temático cuenta como 1 señal
_SIGNAL_GROUPS = [
    # Señal 1: monto con moneda
    [r"\b(?:bs\.?|bob|usd|\$)\s*[\d.,]+", r"\b[\d.,]+\s*(?:bs\.?|bob)\b"],
    # Señal 2: palabra de monto/total
    [r"\b(?:monto|importe|total|amount|valor)\b"],
    # Señal 3: referencia de transacción
    [r"\b(?:transacci[oó]n|referencia|operaci[oó]n|nro\.?|n°)\b"],
    # Señal 4: estado exitoso
    [r"\b(?:autorizado|autorizada|aprobado|aprobada|exitoso|exitosa|confirmado|confirmada)\b"],
    # Señal 5: entidad bancaria o billetera
    [r"\b(?:banco|bcp|bnb|fassil|tigo|yape|plin|billetera|entidad)\b"],
    # Señal 6: fecha con formato dd/mm/yyyy o similar
    [r"\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b"],
    # Señal 7: número largo (código de transacción)
    [r"\b\d{8,}\b"],
    # Señal 8: número de cuenta
    [r"\b(?:cta\.?|cuenta|account)\s*:?\s*[\d\-]{4,}"],
    # Señal 9: palabras de comprobante directas
    [r"\b(?:comprobante|voucher|recibo|receipt|constancia)\b"],
    # Señal 10: transferencia/depósito en texto OCR
    [r"\b(?:transferencia|dep[oó]sito|deposit|env[ií]o|remesa)\b"],
]

_COMPILED_GROUPS = [
    [re.compile(p, re.IGNORECASE) for p in group]
    for group in _SIGNAL_GROUPS
]


def _normalize(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _count_signals(text: str) -> int:
    """Cuenta cuántos grupos temáticos distintos tienen al menos un match."""
    normalized = _normalize(text)
    return sum(
        1 for group in _COMPILED_GROUPS
        if any(pattern.search(normalized) for pattern in group)
    )


def caption_approves(caption: str | None) -> bool:
    normalized = _normalize(caption)
    return any(kw in normalized for kw in CAPTION_KEYWORDS)


def ocr_approves(ocr_raw_text: str | None, ocr_confidence: float, extracted_amount) -> tuple[bool, str]:
    """
    Aprueba si el OCR da señales suficientes de que es un comprobante.
    Umbral bajo intencionalmente: preferimos falsos positivos a falsos negativos.
    """
    text = ocr_raw_text or ""

    # Tiene monto extraído → fuerte señal
    if extracted_amount is not None:
        return True, f"monto extraído: {extracted_amount}"

    # OCR con alta confianza y al menos 1 señal
    if ocr_confidence >= 0.55 and _count_signals(text) >= 1:
        return True, f"OCR confianza={ocr_confidence:.2f} con señales de comprobante"

    # OCR con confianza media y 2+ señales
    if ocr_confidence >= 0.35 and _count_signals(text) >= 2:
        return True, f"OCR confianza={ocr_confidence:.2f} con múltiples señales"

    # OCR bajo pero 3+ señales muy claras (comprobante con imagen de baja calidad)
    signals = _count_signals(text)
    if signals >= 3:
        return True, f"múltiples señales de comprobante ({signals} grupos)"

    return False, f"OCR insuficiente (confianza={ocr_confidence:.2f}, señales={_count_signals(text)})"


def should_ignore_whatsapp_intake(intake, ocr_fields: dict) -> tuple[bool, str]:
    """
    Llamado DESPUÉS del OCR (en intake_processing_service).
    Si llegó hasta acá, ya está guardado — solo decide si ignorar o procesar.
    """
    if intake.source_channel != VoucherSourceChannel.whatsapp:
        return False, ""

    # Caption aprueba → nunca ignorar
    caption = _normalize(getattr(intake, "source_caption", None))
    if any(kw in caption for kw in CAPTION_KEYWORDS):
        return False, ""

    # PDF → nunca ignorar
    mime_type = _normalize(getattr(intake, "mime_type", None))
    file_path = _normalize(getattr(intake, "file_path", None))
    if "pdf" in mime_type or file_path.endswith(".pdf"):
        return False, ""

    approved, reason = ocr_approves(
        ocr_fields.get("ocr_raw_text"),
        float(ocr_fields.get("ocr_confidence") or 0),
        ocr_fields.get("extracted_amount"),
    )
    if approved:
        return False, ""

    return True, f"Ignorado: no parece comprobante — {reason}"


def pre_filter_whatsapp_image(
    caption: str | None,
    mime_type: str | None,
    image_bytes: bytes | None,
) -> tuple[bool, str]:
    """
    Filtro PREVIO a guardar (en build_whatsapp_incoming_intake).
    Usa solo caption + OCR rápido sobre los bytes en memoria.
    """
    # Caption aprueba
    if caption_approves(caption):
        return True, "caption contiene palabras clave"

    # PDF siempre pasa
    if mime_type and "pdf" in mime_type.lower():
        return True, "archivo PDF"

    # Sin imagen no podemos hacer más — duda razonable → aceptar
    if not image_bytes:
        return True, "sin imagen para analizar, se acepta por precaución"

    # OCR rápido sobre los bytes en memoria (reutiliza tu extractor)
    raw_text, confidence = _quick_ocr_bytes(image_bytes)
    ocr_fields = _quick_parse(raw_text, confidence)

    approved, reason = ocr_approves(
        ocr_fields["ocr_raw_text"],
        ocr_fields["ocr_confidence"],
        ocr_fields["extracted_amount"],
    )
    return approved, reason


def _quick_ocr_bytes(image_bytes: bytes) -> tuple[str, float]:
    """OCR sobre bytes en memoria, sin guardar archivo."""
    try:
        from PIL import Image, ImageFilter, ImageOps
        from io import BytesIO

        img = Image.open(BytesIO(image_bytes))
        img.thumbnail((1200, 1200))  # reducir para velocidad
        img = img.convert("L")
        img = ImageOps.autocontrast(img)
        img = img.filter(ImageFilter.SHARPEN)

        # Intentar con pytesseract primero
        try:
            import pytesseract
            text = pytesseract.image_to_string(img, lang="spa+eng", config="--psm 6")
            if text.strip():
                from app.services.ocr.parsing import estimate_confidence
                return text, estimate_confidence(text)
        except Exception:
            pass

        # Fallback a RapidOCR
        try:
            from rapidocr_onnxruntime import RapidOCR
            engine = RapidOCR()
            result = engine(img)
            if result:
                lines = [str(item[1]) for item in result if item and len(item) >= 2 and item[1]]
                confs = [float(item[2]) for item in result if item and len(item) >= 3]
                text = "\n".join(lines)
                confidence = round(sum(confs) / len(confs), 2) if confs else 0.0
                return text, confidence
        except Exception:
            pass

    except Exception:
        pass

    return "", 0.0


def _quick_parse(raw_text: str, confidence: float) -> dict:
    """Parseo rápido reutilizando tu parsing existente."""
    try:
        from app.services.ocr.parsing import parse_amount, estimate_confidence
        return {
            "ocr_raw_text": raw_text,
            "ocr_confidence": confidence or estimate_confidence(raw_text),
            "extracted_amount": parse_amount(raw_text),
        }
    except Exception:
        return {
            "ocr_raw_text": raw_text,
            "ocr_confidence": confidence,
            "extracted_amount": None,
        }