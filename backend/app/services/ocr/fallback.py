from __future__ import annotations

try:
    from app.services.vision_fallback_service import extract_vision_fallback_text
except Exception:
    extract_vision_fallback_text = None

from .parsing import estimate_confidence


def maybe_apply_vision_fallback(file_path: str, raw_text: str, confidence: float) -> tuple[str, float, bool]:
    if not extract_vision_fallback_text or (raw_text.strip() and confidence >= 0.55):
        return raw_text, confidence, False

    fallback = extract_vision_fallback_text(file_path)
    fallback_text = fallback.get("raw_text") or ""
    fallback_confidence = float(fallback.get("confidence") or 0.0)
    if len(fallback_text.strip()) <= len(raw_text.strip()):
        return raw_text, confidence, False

    merged_text = fallback_text
    merged_confidence = max(confidence, fallback_confidence, estimate_confidence(merged_text))
    return merged_text, merged_confidence, True