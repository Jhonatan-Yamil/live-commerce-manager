from __future__ import annotations

import os
from io import BytesIO
from typing import Any

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

try:
    from PIL import Image, ImageFilter, ImageOps
except Exception:
    Image = None
    ImageFilter = None
    ImageOps = None

_ocr_engine = None


def _get_engine():
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine
    try:
        from rapidocr_onnxruntime import RapidOCR  # type: ignore[import-not-found]
    except Exception:
        return None

    _ocr_engine = RapidOCR()
    return _ocr_engine


def _open_image(file_path: str):
    if not Image:
        return None
    return Image.open(file_path)


def _render_pdf_pages(file_path: str) -> list[Any]:
    if not (fitz and Image):
        return []

    doc = fitz.open(file_path)
    images = []
    try:
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
            image = Image.open(BytesIO(pix.tobytes("png")))
            images.append(image)
    finally:
        doc.close()
    return images


def _preprocess_image(image):
    if not Image:
        return image
    processed = image.convert("L")
    processed = ImageOps.autocontrast(processed)
    processed = processed.filter(ImageFilter.SHARPEN)
    return processed


def _extract_with_rapidocr(image) -> tuple[str, float]:
    engine = _get_engine()
    if engine is None:
        return "", 0.0

    result = engine(image)
    if not result:
        return "", 0.0

    lines: list[str] = []
    confidences: list[float] = []
    for item in result:
        if not item or len(item) < 2:
            continue
        box, text, *rest = item
        if text:
            lines.append(str(text))
        if rest:
            try:
                confidences.append(float(rest[0]))
            except Exception:
                continue

    raw_text = "\n".join(lines).strip()
    confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0
    return raw_text, confidence


def extract_vision_fallback_text(file_path: str) -> dict:
    ext = os.path.splitext(file_path)[1].lower()
    images = []

    if ext == ".pdf":
        images = _render_pdf_pages(file_path)
    else:
        image = _open_image(file_path)
        if image is not None:
            images = [image]

    if not images:
        return {"raw_text": "", "confidence": 0.0}

    texts: list[str] = []
    confidence_values: list[float] = []

    for image in images:
        processed = _preprocess_image(image)
        raw_text, confidence = _extract_with_rapidocr(processed)
        if raw_text:
            texts.append(raw_text)
        if confidence > 0:
            confidence_values.append(confidence)

    raw_text = "\n".join(texts).strip()
    confidence = round(sum(confidence_values) / len(confidence_values), 2) if confidence_values else 0.0
    return {"raw_text": raw_text, "confidence": confidence}
