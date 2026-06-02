from __future__ import annotations

from typing import Any


IMAGE_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
PDF_MIME_TYPES = {"application/pdf"}
MEDIA_MESSAGE_KEYS = ("imageMessage", "documentMessage")


def _unwrap_payload(update: Any) -> dict[str, Any]:
    if not isinstance(update, dict):
        return {}

    for candidate_key in ("data", "body", "payload"):
        candidate = update.get(candidate_key)
        if isinstance(candidate, dict) and (
            candidate.get("key") or candidate.get("message") or candidate.get("messageType")
        ):
            return candidate

    return update


def _extract_media_blob(message_payload: dict[str, Any]) -> dict[str, Any] | None:
    message = message_payload.get("message")
    if not isinstance(message, dict):
        return None

    message_type = message_payload.get("messageType") or message.get("messageType")
    if isinstance(message_type, str) and message_type in message and isinstance(message[message_type], dict):
        return message[message_type]

    for key in MEDIA_MESSAGE_KEYS:
        value = message.get(key)
        if isinstance(value, dict):
            return value

    if isinstance(message.get("base64"), str) or isinstance(message.get("mediaUrl"), str):
        return message

    return None


def _extract_instance_name(message_payload: dict[str, Any]) -> str | None:
    for key in ("instanceName", "instance_name", "instance"):
        value = message_payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            for nested_key in ("instanceName", "name", "instance_name", "id"):
                nested_value = value.get(nested_key)
                if isinstance(nested_value, str) and nested_value.strip():
                    return nested_value.strip()
    return None


def _resolve_sender_phone(message_payload: dict[str, Any]) -> str | None:
    participant = message_payload.get("participant")
    if isinstance(participant, str) and participant.strip():
        return participant.split("@")[0]

    remote_jid = message_payload.get("key", {}).get("remoteJid")
    if isinstance(remote_jid, str) and remote_jid.strip():
        return remote_jid.split("@")[0]

    return None


def _resolve_filename(message_id: str | None, media_kind: str, mime_type: str | None) -> str:
    extension = ".pdf" if media_kind == "document" else ".jpg"
    if isinstance(mime_type, str):
        normalized = mime_type.lower()
        if normalized in IMAGE_MIME_TYPES:
            extension = ".jpg" if normalized == "image/jpeg" else ".png"
        elif normalized in PDF_MIME_TYPES:
            extension = ".pdf"

    safe_message_id = (message_id or "whatsapp_media").replace("/", "_")
    return f"{safe_message_id}{extension}"


def _resolve_media_kind(message_payload: dict[str, Any], media_blob: dict[str, Any]) -> str | None:
    message_type = str(message_payload.get("messageType") or media_blob.get("mediaType") or "").lower()
    mime_type = str(media_blob.get("mimetype") or media_blob.get("mime_type") or "").lower()
    filename = str(media_blob.get("fileName") or media_blob.get("filename") or "").lower()

    if "image" in message_type or mime_type.startswith("image/"):
        return "image"

    if "document" in message_type or mime_type in PDF_MIME_TYPES or filename.endswith(".pdf"):
        return "document"

    return None


def extract_message_file_info(update: Any) -> dict[str, Any] | None:
    message_payload = _unwrap_payload(update)
    media_blob = _extract_media_blob(message_payload)

    if not media_blob:
        return None

    media_kind = _resolve_media_kind(message_payload, media_blob)
    if not media_kind:
        return None

    mime_type = str(media_blob.get("mimetype") or media_blob.get("mime_type") or "").strip() or None
    filename = str(media_blob.get("fileName") or media_blob.get("filename") or _resolve_filename(
        message_payload.get("key", {}).get("id"),
        media_kind,
        mime_type,
    ))
    base64_value = media_blob.get("base64") if isinstance(media_blob.get("base64"), str) else None
    media_url = media_blob.get("mediaUrl") if isinstance(media_blob.get("mediaUrl"), str) else None

    return {
        "message_payload": message_payload,
        "instance_name": _extract_instance_name(message_payload),
        "media_kind": media_kind,
        "filename": filename,
        "mime_type": mime_type,
        "base64": base64_value,
        "media_url": media_url,
        "chat_id": message_payload.get("key", {}).get("remoteJid"),
        "message_id": message_payload.get("key", {}).get("id"),
        "from_me": bool(message_payload.get("key", {}).get("fromMe")),
        "sender_phone": _resolve_sender_phone(message_payload),
        "caption": media_blob.get("caption"),
    }
