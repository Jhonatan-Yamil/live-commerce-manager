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

try:
    from app.services.vision_fallback_service import extract_vision_fallback_text
except Exception:
    extract_vision_fallback_text = None


AMOUNT_LABEL_PATTERNS = [
    r"la\s+suma\s+de",
    r"monto",
    r"importe",
    r"total",
    r"valor",
]

DATE_LABEL_PATTERNS = [
    r"fecha\s+de\s+la\s+transacci[oó]n",
    r"fecha",
]

REFERENCE_LABEL_PATTERNS = [
    r"transacci[oó]n",
    r"referencia",
    r"nro\.?\s*(?:de\s*)?operaci[oó]n",
]

SENDER_LABEL_PATTERNS = [
    r"nombre\s+del\s+originante",
    r"ordenante",
    r"remitente",
    r"de",
]


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


def _to_amount(value: str) -> float | None:
    try:
        return round(float(value.replace(",", ".")), 2)
    except ValueError:
        return None


def _normalized_lines(raw_text: str) -> list[str]:
    return [line.strip() for line in raw_text.splitlines() if line.strip()]


def _line_has_label(line: str, label_patterns: list[str]) -> bool:
    for pattern in label_patterns:
        if re.search(pattern, line, flags=re.IGNORECASE):
            return True
    return False


def _collect_following_numeric_lines(lines: list[str], anchor_idx: int, window: int = 60) -> list[float]:
    candidates: list[float] = []
    for candidate in lines[anchor_idx + 1:anchor_idx + window]:
        if any(token in candidate for token in ["/", ":", "*", "x", "X"]):
            continue
        if re.search(r"[A-Za-z]", candidate):
            continue
        clean_match = re.fullmatch(r"([0-9]+(?:[\.,][0-9]{1,2})?)", candidate)
        if not clean_match:
            continue
        amount = _to_amount(clean_match.group(1))
        if amount is not None:
            candidates.append(amount)
    return candidates


def _collect_labeled_amount_candidates(raw_text: str) -> list[tuple[float, float]]:
    lines = _normalized_lines(raw_text)
    candidates: list[tuple[float, float]] = []

    # Caso en misma línea: si la línea contiene una etiqueta de monto, toma el primer número cercano.
    for line in lines:
        if not _line_has_label(line, AMOUNT_LABEL_PATTERNS):
            continue
        match = re.search(r"([0-9]+(?:[\.,][0-9]{1,2})?)", line)
        if not match:
            continue
        amount_text = match.group(1)
        amount = _to_amount(amount_text)
        if amount is None:
            continue
        score = 0.98 if re.search(r"[\.,]", amount_text) else 0.9
        candidates.append((amount, score))

    # Caso en líneas siguientes: etiqueta y luego valor numérico limpio.
    for idx, line in enumerate(lines):
        if not _line_has_label(line, AMOUNT_LABEL_PATTERNS):
            continue
        for amount in _collect_following_numeric_lines(lines, idx):
            candidates.append((amount, 0.9))

    # Patrones de moneda genéricos.
    currency_patterns = [
        r"\b(?:bs|b\$|bob|ps|8s|s/)\.?\s*([0-9]+(?:[\.,][0-9]{1,2})?)",
        r"\b([0-9]+(?:[\.,][0-9]{1,2})?)\s*(?:bs|b\$|bob)\b",
    ]
    for pattern in currency_patterns:
        for line in lines:
            match = re.search(pattern, line, flags=re.IGNORECASE)
            if not match:
                continue
            amount_text = match.group(1)
            amount = _to_amount(amount_text)
            if amount is not None:
                score = 0.85 if re.search(r"[\.,]", amount_text) else 0.7
                candidates.append((amount, score))

    # Bloques típicos de apps bancarias: "Pago realizado".
    for idx, line in enumerate(lines):
        if not re.search(r"pago\s+realizado", line, flags=re.IGNORECASE):
            continue
        window_lines = lines[idx:idx + 4]
        for window_line in window_lines:
            match = re.search(r"([0-9]+(?:[\.,][0-9]{1,2}))", window_line)
            if match:
                amount_text = match.group(1)
                amount = _to_amount(amount_text)
                if amount is not None:
                    score = 0.88 if re.search(r"[\.,]", amount_text) else 0.8
                    candidates.append((amount, score))

    # Fallback numérico (baja confianza).
    for idx, line in enumerate(lines):
        if not _line_has_label(line, AMOUNT_LABEL_PATTERNS):
            continue
        for candidate in lines[idx + 1:idx + 4]:
            if re.search(r"[A-Za-z]", candidate):
                continue
            match = re.fullmatch(r"([0-9]+(?:[\.,][0-9]{1,2})?)", candidate)
            if not match:
                continue
            amount_text = match.group(1)
            amount = _to_amount(amount_text)
            if amount is not None:
                score = 0.8 if re.search(r"[\.,]", amount_text) else 0.65
                candidates.append((amount, score))

    return candidates


def _best_amount_candidate(candidates: list[tuple[float, float]]) -> float | None:
    if not candidates:
        return None
    # Prioriza score alto y, en empate, el monto más alto para evitar capturar "12" de fecha.
    best = max(candidates, key=lambda x: (x[1], x[0]))
    return best[0]


def _parse_amount(raw_text: str) -> float | None:
    candidates = _collect_labeled_amount_candidates(raw_text)
    if candidates:
        return _best_amount_candidate(candidates)

    # Solo si no hubo una etiqueta de monto, usa un fallback muy conservador.
    lines = _normalized_lines(raw_text)
    for line in lines:
        if not any(token in line.lower() for token in ["bs", "b$", "bob", "ps", "s/"]):
            continue
        match = re.search(r"([0-9]+(?:[\.,][0-9]{1,2})?)", line)
        if not match:
            continue
        amount = _to_amount(match.group(1))
        if amount is not None:
            return amount

    return None


def _parse_date(raw_text: str) -> datetime | None:
    lines = _normalized_lines(raw_text)

    # Intenta fecha etiquetada: "Fecha ...: 12/04/2026"
    for idx, line in enumerate(lines):
        if not _line_has_label(line, DATE_LABEL_PATTERNS):
            continue

        same_line_match = re.search(r"(\d{2}/\d{2}/\d{4})(?:\s*[-]\s*(\d{2}:\d{2}(?::\d{2})?))?", line)
        if same_line_match:
            date_part = same_line_match.group(1)
            time_part = same_line_match.group(2)
            try:
                if time_part:
                    fmt = "%d/%m/%Y %H:%M:%S" if len(time_part) == 8 else "%d/%m/%Y %H:%M"
                    return datetime.strptime(f"{date_part} {time_part}", fmt)
                return datetime.strptime(date_part, "%d/%m/%Y")
            except ValueError:
                pass

        # Valor en siguiente línea.
        for next_line in lines[idx + 1:idx + 5]:
            next_match = re.search(r"(\d{2}/\d{2}/\d{4})(?:\s*[-]\s*(\d{2}:\d{2}(?::\d{2})?))?", next_line)
            if not next_match:
                continue
            date_part = next_match.group(1)
            time_part = next_match.group(2)
            try:
                if time_part:
                    fmt = "%d/%m/%Y %H:%M:%S" if len(time_part) == 8 else "%d/%m/%Y %H:%M"
                    return datetime.strptime(f"{date_part} {time_part}", fmt)
                return datetime.strptime(date_part, "%d/%m/%Y")
            except ValueError:
                continue

    # Fallback global.
    match = re.search(r"(\d{2}/\d{2}/\d{4})(?:\s*[-]\s*(\d{2}:\d{2}(?::\d{2})?))?", raw_text)
    if not match:
        return None

    date_part = match.group(1)
    time_part = match.group(2)
    try:
        if time_part:
            fmt = "%d/%m/%Y %H:%M:%S" if len(time_part) == 8 else "%d/%m/%Y %H:%M"
            return datetime.strptime(f"{date_part} {time_part}", fmt)
        return datetime.strptime(date_part, "%d/%m/%Y")
    except ValueError:
        return None


def _parse_reference(raw_text: str) -> str | None:
    lines = _normalized_lines(raw_text)

    def _is_reference_candidate(token: str) -> bool:
        token = token.strip()
        if len(token) < 6:
            return False
        if "*" in token:
            return False
        if token.upper().count("X") >= 2:
            return False
        if re.fullmatch(r"\d{2}/\d{2}/\d{4}", token):
            return False
        if "/" in token and not re.search(r"[A-Za-z]", token):
            return False
        has_digit = bool(re.search(r"\d", token))
        has_letter = bool(re.search(r"[A-Za-z]", token))
        if has_letter and has_digit:
            return True
        if has_digit and len(re.sub(r"\D", "", token)) >= 8 and "/" not in token:
            return True
        return False

    identifier_pattern = re.compile(r"\b[A-Za-z0-9\-/]{6,}\b")

    for idx, line in enumerate(lines):
        if not _line_has_label(line, REFERENCE_LABEL_PATTERNS):
            continue

        same_line = re.search(r"(?:Transacci[oó]n|Referencia|Nro\.?\s*(?:de\s*)?operaci[oó]n)\s*:?\s*([A-Za-z0-9\-/]{6,})", line, flags=re.IGNORECASE)
        if same_line:
            token = same_line.group(1).strip()
            if _is_reference_candidate(token):
                return token

        for next_line in lines[idx + 1:idx + 10]:
            next_match = identifier_pattern.search(next_line)
            if next_match and _is_reference_candidate(next_match.group(0)):
                return next_match.group(0).strip()

    match = re.search(r"(?:Transacci[oó]n|Referencia)\s*([A-Za-z0-9\-/]{6,})", raw_text, flags=re.IGNORECASE)
    if match and _is_reference_candidate(match.group(1)):
        return match.group(1).strip()

    for fallback in identifier_pattern.finditer(raw_text):
        token = fallback.group(0).strip()
        if _is_reference_candidate(token):
            return token
    return None


def _parse_sender_name(raw_text: str) -> str | None:
    lines = _normalized_lines(raw_text)

    def _is_name_candidate(value: str) -> bool:
        if re.search(r"\d|\*", value):
            return False
        if "BANCO" in value.upper():
            return False
        words = [w for w in value.split() if w]
        if len(words) < 2:
            return False
        return bool(re.fullmatch(r"[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,}", value))

    for idx, line in enumerate(lines):
        if _line_has_label(line, SENDER_LABEL_PATTERNS):
            same_line = re.search(r":\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,})$", line)
            if same_line:
                return same_line.group(1).strip()

            # En PDFs, el valor puede estar varias líneas después de la etiqueta.
            for candidate in lines[idx + 1:idx + 12]:
                if _is_name_candidate(candidate):
                    return candidate

    # Fallback: primera línea con forma de nombre completo.
    for line in lines:
        if _is_name_candidate(line):
            return line

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
    confidence = _estimate_confidence(raw_text)

    fallback_used = False
    if extract_vision_fallback_text and (not raw_text.strip() or confidence < 0.55):
        fallback = extract_vision_fallback_text(file_path)
        fallback_text = fallback.get("raw_text") or ""
        fallback_confidence = float(fallback.get("confidence") or 0.0)
        if len(fallback_text.strip()) > len(raw_text.strip()):
            raw_text = fallback_text
            confidence = max(confidence, fallback_confidence, _estimate_confidence(raw_text))
            fallback_used = True

    result = {
        "ocr_raw_text": raw_text,
        "ocr_confidence": confidence,
        "extracted_amount": _parse_amount(raw_text),
        "extracted_date": _parse_date(raw_text),
        "extracted_reference": _parse_reference(raw_text),
        "extracted_sender_name": _parse_sender_name(raw_text),
    }

    if fallback_used:
        result["ocr_raw_text"] = raw_text

    return result
