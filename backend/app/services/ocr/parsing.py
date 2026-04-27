from __future__ import annotations

import re
from datetime import datetime


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
    r"enviado\s+por",
    r"cuenta\s+de\s+origen",
    r"cuenta\s+origen",
    r"de\s+la\s+cuenta",
    r"^de$",
    r"nombre\s+del\s+originante",
    r"ordenante",
    r"remitente",
    r"originante",
]

SENDER_SECONDARY_LABEL_PATTERNS = [
    r"a\s+nombre\s+de",
]

DESTINATION_HINT_PATTERNS = [
    r"cuenta\s+de\s+destino",
    r"cuenta\s+destino",
    r"destinatario",
    r"beneficiario",
    r"para",
    r"a\s+la\s+cuenta",
]


def to_amount(value: str) -> float | None:
    try:
        return round(float(value.replace(",", ".")), 2)
    except ValueError:
        return None


def normalized_lines(raw_text: str) -> list[str]:
    return [line.strip() for line in raw_text.splitlines() if line.strip()]


def line_has_label(line: str, label_patterns: list[str]) -> bool:
    for pattern in label_patterns:
        if re.search(pattern, line, flags=re.IGNORECASE):
            return True
    return False


def collect_following_numeric_lines(lines: list[str], anchor_idx: int, window: int = 60) -> list[float]:
    candidates: list[float] = []
    for candidate in lines[anchor_idx + 1:anchor_idx + window]:
        if any(token in candidate for token in ["/", ":", "*", "x", "X"]):
            continue
        if re.search(r"[A-Za-z]", candidate):
            continue
        clean_match = re.fullmatch(r"([0-9]+(?:[\.,][0-9]{1,2})?)", candidate)
        if not clean_match:
            continue
        amount = to_amount(clean_match.group(1))
        if amount is not None:
            candidates.append(amount)
    return candidates


def collect_labeled_amount_candidates(raw_text: str) -> list[tuple[float, float]]:
    lines = normalized_lines(raw_text)
    candidates: list[tuple[float, float]] = []

    for line in lines:
        if not line_has_label(line, AMOUNT_LABEL_PATTERNS):
            continue
        match = re.search(r"([0-9]+(?:[\.,][0-9]{1,2})?)", line)
        if not match:
            continue
        amount_text = match.group(1)
        amount = to_amount(amount_text)
        if amount is None:
            continue
        score = 0.98 if re.search(r"[\.,]", amount_text) else 0.9
        candidates.append((amount, score))

    for idx, line in enumerate(lines):
        if not line_has_label(line, AMOUNT_LABEL_PATTERNS):
            continue
        for amount in collect_following_numeric_lines(lines, idx):
            candidates.append((amount, 0.9))

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
            amount = to_amount(amount_text)
            if amount is not None:
                score = 0.85 if re.search(r"[\.,]", amount_text) else 0.7
                candidates.append((amount, score))

    for idx, line in enumerate(lines):
        if not re.search(r"pago\s+realizado", line, flags=re.IGNORECASE):
            continue
        window_lines = lines[idx:idx + 4]
        for window_line in window_lines:
            match = re.search(r"([0-9]+(?:[\.,][0-9]{1,2}))", window_line)
            if match:
                amount_text = match.group(1)
                amount = to_amount(amount_text)
                if amount is not None:
                    score = 0.88 if re.search(r"[\.,]", amount_text) else 0.8
                    candidates.append((amount, score))

    for idx, line in enumerate(lines):
        if not line_has_label(line, AMOUNT_LABEL_PATTERNS):
            continue
        for candidate in lines[idx + 1:idx + 4]:
            if re.search(r"[A-Za-z]", candidate):
                continue
            match = re.fullmatch(r"([0-9]+(?:[\.,][0-9]{1,2})?)", candidate)
            if not match:
                continue
            amount_text = match.group(1)
            amount = to_amount(amount_text)
            if amount is not None:
                score = 0.8 if re.search(r"[\.,]", amount_text) else 0.65
                candidates.append((amount, score))

    return candidates


def best_amount_candidate(candidates: list[tuple[float, float]]) -> float | None:
    if not candidates:
        return None
    return max(candidates, key=lambda x: (x[1], x[0]))[0]


def parse_amount(raw_text: str) -> float | None:
    candidates = collect_labeled_amount_candidates(raw_text)
    if candidates:
        return best_amount_candidate(candidates)

    lines = normalized_lines(raw_text)
    for line in lines:
        if not any(token in line.lower() for token in ["bs", "b$", "bob", "ps", "s/"]):
            continue
        match = re.search(r"([0-9]+(?:[\.,][0-9]{1,2})?)", line)
        if not match:
            continue
        amount = to_amount(match.group(1))
        if amount is not None:
            return amount

    return None


def parse_date(raw_text: str) -> datetime | None:
    lines = normalized_lines(raw_text)

    for idx, line in enumerate(lines):
        if not line_has_label(line, DATE_LABEL_PATTERNS):
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


def parse_reference(raw_text: str) -> str | None:
    lines = normalized_lines(raw_text)

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
        if not line_has_label(line, REFERENCE_LABEL_PATTERNS):
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


def parse_sender_name(raw_text: str) -> str | None:
    lines = normalized_lines(raw_text)

    operational_noise_patterns = [
        r"se\s+debit[oó]",
        r"se\s+acredit[oó]",
        r"de\s+ahorro",
        r"de\s+corriente",
        r"la\s+suma",
        r"bancarizaci[oó]n",
        r"fecha\s+de\s+la\s+transacci[oó]n",
        r"hora\s+de\s+la\s+transacci[oó]n",
    ]

    business_noise_words = {
        "se", "su", "caja", "ahorro", "corriente", "cuenta", "banco", "destino", "origen",
        "acredito", "acredito", "debito", "debito", "suma", "referencia", "transaccion",
        "fecha", "hora", "bancarizacion", "nombre", "destinatario", "originante",
        "transferencia", "interbancaria", "comprobante", "electronico", "operacion",
    }

    person_connectors = {"de", "del", "la", "las", "los", "y"}

    def _is_name_candidate(value: str) -> bool:
        value = value.strip()
        if not value:
            return False
        if re.search(r"\d|\*", value):
            return False
        normalized = value.lower()
        if any(re.search(pattern, normalized, flags=re.IGNORECASE) for pattern in operational_noise_patterns):
            return False
        upper_value = value.upper()
        blocked_tokens = [
            "BANCO",
            "CUENTA",
            "DESTINO",
            "ORIGEN",
            "COMPROBANTE",
            "TRANSACCION",
            "REFERENCIA",
            "MOTIVO",
            "PAGO",
        ]
        if any(token in upper_value for token in blocked_tokens):
            return False

        words = [w for w in re.split(r"\s+", value) if w]
        if len(words) < 2:
            return False

        cleaned_words = [re.sub(r"[^A-Za-zÁÉÍÓÚÑáéíóúñ]", "", w).lower() for w in words]
        cleaned_words = [w for w in cleaned_words if w]
        if not cleaned_words:
            return False

        if any(w in business_noise_words for w in cleaned_words):
            return False

        content_words = [w for w in cleaned_words if w not in person_connectors]
        if len(content_words) < 2:
            return False

        valid_word = r"[A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ'\.-]*"
        return bool(re.fullmatch(rf"{valid_word}(?:\s+{valid_word}){{1,6}}", value))

    def _name_quality_bonus(value: str) -> float:
        words = [w for w in re.split(r"\s+", value.strip()) if w]
        if not words:
            return 0.0

        capitalized_like = 0
        for word in words:
            plain = re.sub(r"[^A-Za-zÁÉÍÓÚÑáéíóúñ]", "", word)
            if not plain:
                continue
            if plain.isupper() or (plain[0].isupper() and plain[1:].islower()):
                capitalized_like += 1

        ratio = capitalized_like / max(1, len(words))
        base = 0.08 if ratio >= 0.75 else 0.0
        if len(words) >= 3:
            base += 0.04
        return base

    def _extract_name_from_same_line(line: str) -> str | None:
        if ":" not in line:
            return None
        candidate = line.split(":", 1)[1].strip()
        return candidate if _is_name_candidate(candidate) else None

    def _context_penalty(idx: int) -> float:
        start = max(0, idx - 2)
        end = min(len(lines), idx + 2)
        neighborhood = " ".join(lines[start:end]).lower()
        return 0.4 if any(re.search(p, neighborhood, flags=re.IGNORECASE) for p in DESTINATION_HINT_PATTERNS) else 0.0

    scored_candidates: list[tuple[str, float]] = []

    for idx, line in enumerate(lines):
        if line_has_label(line, SENDER_LABEL_PATTERNS):
            same_line_name = _extract_name_from_same_line(line)
            if same_line_name:
                score = 1.0 - _context_penalty(idx) + _name_quality_bonus(same_line_name)
                scored_candidates.append((same_line_name, score))

            for step, candidate in enumerate(lines[idx + 1:idx + 25], start=1):
                if _is_name_candidate(candidate):
                    score = 0.98 - (step * 0.03) - _context_penalty(idx) + _name_quality_bonus(candidate)
                    scored_candidates.append((candidate, score))

        elif line_has_label(line, SENDER_SECONDARY_LABEL_PATTERNS):
            same_line_name = _extract_name_from_same_line(line)
            if same_line_name:
                score = 0.65 - _context_penalty(idx) + _name_quality_bonus(same_line_name)
                scored_candidates.append((same_line_name, score))

            for step, candidate in enumerate(lines[idx + 1:idx + 3], start=1):
                if _is_name_candidate(candidate):
                    score = 0.62 - (step * 0.04) - _context_penalty(idx) + _name_quality_bonus(candidate)
                    scored_candidates.append((candidate, score))

    if scored_candidates:
        best_name, _ = max(scored_candidates, key=lambda item: item[1])
        return best_name

    for idx, line in enumerate(lines):
        if not _is_name_candidate(line):
            continue
        start = max(0, idx - 2)
        neighborhood = " ".join(lines[start:idx + 1]).lower()
        if any(re.search(pattern, neighborhood, flags=re.IGNORECASE) for pattern in DESTINATION_HINT_PATTERNS):
            continue
        return line

    return None


def estimate_confidence(raw_text: str) -> float:
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