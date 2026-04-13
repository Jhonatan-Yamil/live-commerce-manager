import os
import re
from datetime import datetime
from io import BytesIO

try:
    import pdfplumber
except Exception:
    pdfplumber = None

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

try:
    from PIL import Image
except Exception:
    Image = None

try:
    import pytesseract
except Exception:
    pytesseract = None


def _extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF. If PDF is image-based, renders to image and uses OCR."""
    text_chunks = []
    
    # Intenta extraer texto directamente con pdfplumber
    if pdfplumber:
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    if page_text:
                        text_chunks.append(page_text)
        except Exception:
            pass
    
    # Si no extrajo texto (PDF basado en imagen), renderiza a imagen y usa OCR
    if not text_chunks and fitz and Image and pytesseract:
        try:
            doc = fitz.open(file_path)
            for page_num, page in enumerate(doc):
                # Renderizar página a imagen (zoom 2x para mejor OCR)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_data = pix.tobytes("ppm")
                image = Image.open(BytesIO(img_data))
                
                # Aplicar OCR
                ocr_text = pytesseract.image_to_string(image, lang="spa+eng")
                if ocr_text.strip():
                    text_chunks.append(ocr_text)
            doc.close()
        except Exception:
            pass
    
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

    # Caso BNB: "La suma de Bs.:" seguido por el monto en una línea numérica.
    label_match = re.search(
        r"la\s+suma\s+de\s+(?:bs|b\$|bob|ps|8s|s/)\.?[ \t]*:?[ \t]*([0-9]+(?:[\.,][0-9]{1,2})?)",
        lowered,
        flags=re.IGNORECASE,
    )
    if label_match:
        amount = _to_amount(label_match.group(1))
        if amount is not None:
            return amount

    # Si la maquetación del PDF separa etiquetas/valores, busca el primer número
    # "limpio" en las siguientes líneas y evita fechas/horas/cuentas enmascaradas.
    lines = [line.strip() for line in raw_text.splitlines()]
    anchor_idx = None
    for idx, line in enumerate(lines):
        if re.search(r"la\s+suma\s+de\s+(?:bs|b\$|bob|ps|8s|s/)", line, flags=re.IGNORECASE):
            anchor_idx = idx
            break

    if anchor_idx is not None:
        numeric_candidates: list[float] = []
        for candidate in lines[anchor_idx + 1:anchor_idx + 60]:
            if not candidate:
                continue
            if any(token in candidate for token in ["/", ":", "*", "x", "X"]):
                continue
            if re.search(r"[A-Za-z]", candidate):
                continue
            clean_match = re.fullmatch(r"([0-9]+(?:[\.,][0-9]{1,2})?)", candidate)
            if not clean_match:
                continue
            amount = _to_amount(clean_match.group(1))
            if amount is not None:
                numeric_candidates.append(amount)

        # En comprobantes BNB suele aparecer un único monto limpio (ej. 100).
        # Si hay más de uno, prioriza el más alto para evitar capturar "12" de fecha.
        if numeric_candidates:
            return max(numeric_candidates)

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

    # Fallback: primer número válido (decimal o entero) en el texto.
    match = re.search(r"\b([0-9]+(?:[\.,][0-9]{1,2})?)\b", raw_text)
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
