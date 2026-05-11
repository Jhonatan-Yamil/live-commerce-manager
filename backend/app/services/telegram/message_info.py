from __future__ import annotations


def _extract_document_file_info(message: dict) -> dict | None:
    document = message.get("document")
    if not document:
        return None

    return {
        "file_id": document.get("file_id"),
        "filename": document.get("file_name") or f"telegram_doc_{message.get('message_id')}.bin",
        "mime_type": document.get("mime_type"),
    }


def _extract_photo_file_info(message: dict) -> dict | None:
    photos = message.get("photo") or []
    if not photos:
        return None

    best_photo = photos[-1]
    return {
        "file_id": best_photo.get("file_id"),
        "filename": f"telegram_photo_{message.get('message_id')}.jpg",
        "mime_type": "image/jpeg",
    }


def extract_message_file_info(update: dict) -> dict | None:
    message = update.get("message") or update.get("edited_message")
    if not message:
        return None

    file_info = _extract_document_file_info(message) or _extract_photo_file_info(message)
    if not file_info or not file_info.get("file_id"):
        return None

    sender_phone = (message.get("contact") or {}).get("phone_number")

    return {
        "file_id": file_info["file_id"],
        "filename": file_info["filename"],
        "mime_type": file_info.get("mime_type"),
        "chat_id": str((message.get("chat") or {}).get("id") or ""),
        "message_id": str(message.get("message_id") or ""),
        "sender_phone": sender_phone,
    }