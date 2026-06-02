from __future__ import annotations

import base64
from tempfile import SpooledTemporaryFile
from typing import Any

from app.core.config import settings

from .http_client import download_base64_from_media_message


class InboundMediaFile:
    def __init__(self, filename: str, content_type: str | None, content: bytes):
        self.filename = filename
        self.content_type = content_type
        self.file = SpooledTemporaryFile(max_size=10 * 1024 * 1024)
        self.file.write(content)
        self.file.seek(0)


def _infer_content_type(filename: str, mime_type: str | None) -> str | None:
    normalized = (mime_type or "").strip().lower()
    if normalized in {"image/jpeg", "image/jpg", "image/png", "application/pdf"}:
        return "image/jpeg" if normalized == "image/jpg" else normalized

    lower_filename = filename.lower()
    if lower_filename.endswith(".pdf"):
        return "application/pdf"
    if lower_filename.endswith(".png"):
        return "image/png"
    if lower_filename.endswith((".jpg", ".jpeg", ".webp")):
        return "image/jpeg"

    return normalized or None


def _strip_data_url_prefix(base64_value: str) -> str:
    if "," in base64_value and base64_value.lower().startswith("data:"):
        return base64_value.split(",", 1)[1]
    return base64_value


def _decode_base64_content(base64_value: str) -> bytes:
    return base64.b64decode(_strip_data_url_prefix(base64_value))


def _ensure_allowed_extension(filename: str, mime_type: str | None) -> str:
    lower_filename = filename.lower()
    allowed_extensions = (".jpg", ".jpeg", ".png", ".pdf")
    if lower_filename.endswith(allowed_extensions):
        return filename

    if mime_type and mime_type.lower() == "application/pdf":
        return f"{filename}.pdf"

    if mime_type and mime_type.lower() == "image/png":
        return f"{filename}.png"

    if mime_type and mime_type.lower() == "image/webp":
        return f"{filename}.jpg"

    return f"{filename}.jpg"


def build_upload_from_whatsapp_message(message_payload: dict[str, Any], info: dict[str, Any]) -> InboundMediaFile:
    base64_value = info.get("base64")
    mime_type = info.get("mime_type")
    filename = info.get("filename") or "whatsapp_media.jpg"


    if not base64_value:
        instance_name = info.get("instance_name") or settings.WHATSAPP_EVOLUTION_INSTANCE_NAME
        try:
            download_result = download_base64_from_media_message(instance_name, message_payload)
            base64_value = download_result.get("base64")
            mime_type = download_result.get("mimetype") or download_result.get("mimeType") or mime_type
            filename = download_result.get("fileName") or download_result.get("filename") or filename
        except Exception as e:
            raise

    if not base64_value:
        raise ValueError("No se pudo obtener el contenido del archivo multimedia de WhatsApp")

    content = _decode_base64_content(base64_value)
    filename = _ensure_allowed_extension(filename, mime_type)
    mime_type = _infer_content_type(filename, mime_type)

    return InboundMediaFile(
        filename=filename,
        content_type=mime_type,
        content=content,
    )