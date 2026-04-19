from .extraction import extract_text
from .fallback import maybe_apply_vision_fallback
from .parsing import estimate_confidence, parse_amount, parse_date, parse_reference, parse_sender_name


def build_voucher_fields_result(raw_text: str, confidence: float) -> dict:
    return {
        "ocr_raw_text": raw_text,
        "ocr_confidence": confidence,
        "extracted_amount": parse_amount(raw_text),
        "extracted_date": parse_date(raw_text),
        "extracted_reference": parse_reference(raw_text),
        "extracted_sender_name": parse_sender_name(raw_text),
    }


def extract_voucher_fields(file_path: str) -> dict:
    raw_text = extract_text(file_path) or ""
    confidence = estimate_confidence(raw_text)
    raw_text, confidence, _ = maybe_apply_vision_fallback(file_path, raw_text, confidence)
    return build_voucher_fields_result(raw_text, confidence)