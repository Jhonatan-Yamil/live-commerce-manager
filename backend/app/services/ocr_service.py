import os
import re
from datetime import datetime

try:
    import pdfplumber
except Exception:
    pdfplumber = None

try:
    from PIL import Image
except Exception:
    Image = None

try:
    import pytesseract
except Exception:
    pytesseract = None


def _extract_text_from_pdf(file_path: str) -> str:
    if not pdfplumber:
        return ""
    text_chunks = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text:
                text_chunks.append(page_text)
    return "\n".join(text_chunks)


def _extract_text_from_image(file_path: str) -> str:
    if not (Image and pytesseract):
        return ""
    image = Image.open(file_path)
    try:
        return pytesseract.image_to_string(image, lang="spa+eng")
    except Exception:
        try:
            return pytesseract.image_to_string(image)
        except Exception:
            return ""


def _extract_text(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return _extract_text_from_pdf(file_path)
    return _extract_text_from_image(file_path)


def _parse_amount(raw_text: str) -> float | None:
    def _to_amount(value: str) -> float | None:
        try:
            return round(float(value.replace(",", ".")), 2)
        except ValueError:
            return None

    lowered = raw_text.lower()

    # Prioriza la zona del encabezado "Pago realizado" donde suele aparecer el monto.
    anchor = re.search(r"pago\s+realizado", lowered)
    if anchor:
        window = raw_text[anchor.end():anchor.end() + 120]
        match = re.search(r"([0-9]+(?:[\.,][0-9]{1,2}))", window)
        if match:
            amount = _to_amount(match.group(1))
            if amount is not None:
                return amount

    currency_patterns = [
        r"\b(?:bs|b\$|bob|ps|8s|s/)\.?\s*([0-9]+(?:[\.,][0-9]{1,2})?)",
        r"\b([0-9]+(?:[\.,][0-9]{1,2})?)\s*(?:bs|b\$|bob)\b",
    ]
    for pattern in currency_patterns:
        match = re.search(pattern, lowered, flags=re.IGNORECASE)
        if match:
            amount = _to_amount(match.group(1))
            if amount is not None:
                return amount

    # Fallback: primer decimal válido en el texto.
    match = re.search(r"\b([0-9]+(?:[\.,][0-9]{2}))\b", raw_text)
    if match:
        amount = _to_amount(match.group(1))
        if amount is not None:
            return amount

    return None


def _parse_date(raw_text: str) -> datetime | None:
    match = re.search(r"(\d{2}/\d{2}/\d{4})(?:\s*[-]\s*(\d{2}:\d{2}))?", raw_text)
    if not match:
        return None

    date_part = match.group(1)
    time_part = match.group(2)

    try:
        if time_part:
            return datetime.strptime(f"{date_part} {time_part}", "%d/%m/%Y %H:%M")
        return datetime.strptime(date_part, "%d/%m/%Y")
    except ValueError:
        return None


def _parse_reference(raw_text: str) -> str | None:
    match = re.search(r"(?:Transacci[oó]n|Referencia)\s*([A-Za-z0-9\-/]+)", raw_text, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _parse_sender_name(raw_text: str) -> str | None:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    for idx, line in enumerate(lines):
        if line.lower() == "de" and idx + 1 < len(lines):
            return lines[idx + 1]
    return None


def _estimate_confidence(raw_text: str) -> float:
    text_len = len(raw_text.strip())
    if text_len == 0:
        return 0.0
    if text_len < 40:
        return 0.35
    if text_len < 120:
        return 0.55
    if text_len < 300:
        return 0.7
    return 0.82


def extract_voucher_fields(file_path: str) -> dict:
    raw_text = _extract_text(file_path) or ""

    return {
        "ocr_raw_text": raw_text,
        "ocr_confidence": _estimate_confidence(raw_text),
        "extracted_amount": _parse_amount(raw_text),
        "extracted_date": _parse_date(raw_text),
        "extracted_reference": _parse_reference(raw_text),
        "extracted_sender_name": _parse_sender_name(raw_text),
    }
