import json
import urllib.parse
import urllib.request
from tempfile import SpooledTemporaryFile
from fastapi import UploadFile

from app.core.config import settings


def _telegram_api_get(path: str, params: dict | None = None) -> dict:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no configurado")

    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{path}{query}"

    with urllib.request.urlopen(url, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if not payload.get("ok"):
        raise ValueError(f"Error API Telegram: {payload}")
    return payload["result"]


def _download_telegram_file(file_path: str) -> bytes:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN no configurado")

    url = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read()


def extract_message_file_info(update: dict) -> dict | None:
    message = update.get("message") or update.get("edited_message")
    if not message:
        return None

    file_id = None
    filename = None
    mime_type = None

    if message.get("document"):
        document = message["document"]
        file_id = document.get("file_id")
        filename = document.get("file_name") or f"telegram_doc_{message.get('message_id')}.bin"
        mime_type = document.get("mime_type")
    elif message.get("photo"):
        photos = message.get("photo") or []
        if photos:
            best_photo = photos[-1]
            file_id = best_photo.get("file_id")
            filename = f"telegram_photo_{message.get('message_id')}.jpg"
            mime_type = "image/jpeg"

    if not file_id:
        return None

    sender_phone = None
    if message.get("contact"):
        sender_phone = message["contact"].get("phone_number")

    return {
        "file_id": file_id,
        "filename": filename,
        "mime_type": mime_type,
        "chat_id": str((message.get("chat") or {}).get("id") or ""),
        "message_id": str(message.get("message_id") or ""),
        "sender_phone": sender_phone,
    }


def build_upload_from_telegram_file(file_id: str, filename: str, mime_type: str | None = None) -> UploadFile:
    file_meta = _telegram_api_get("getFile", {"file_id": file_id})
    file_path = file_meta.get("file_path")
    if not file_path:
        raise ValueError("Telegram no devolvió file_path")

    content = _download_telegram_file(file_path)

    spooled = SpooledTemporaryFile(max_size=10 * 1024 * 1024)
    spooled.write(content)
    spooled.seek(0)

    return UploadFile(filename=filename, file=spooled)
