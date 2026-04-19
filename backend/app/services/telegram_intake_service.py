import json
import logging
import os
import time
import urllib.parse
import urllib.request
from tempfile import SpooledTemporaryFile
from fastapi import UploadFile

from app.core.config import settings


logger = logging.getLogger(__name__)


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


def _get_ngrok_public_url() -> str | None:
    api_base = settings.NGROK_API_URL.rstrip("/")
    url = f"{api_base}/api/tunnels"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None

    tunnels = payload.get("tunnels") or []
    https_tunnel = next((t for t in tunnels if str(t.get("public_url", "")).startswith("https://")), None)
    if https_tunnel:
        return https_tunnel.get("public_url")

    http_tunnel = next((t for t in tunnels if str(t.get("public_url", "")).startswith("http://")), None)
    return http_tunnel.get("public_url") if http_tunnel else None


def _get_public_base_url() -> str | None:
    explicit = settings.TELEGRAM_PUBLIC_BASE_URL
    if explicit:
        return explicit.rstrip("/")

    domain = os.getenv("DOMAIN_NAME", "").strip()
    if domain:
        if domain.startswith("http://") or domain.startswith("https://"):
            return domain.rstrip("/")
        if domain == "localhost":
            return "http://localhost"
        return f"https://{domain}"

    ngrok_url = _get_ngrok_public_url()
    if ngrok_url:
        return ngrok_url.rstrip("/")

    return None


def auto_configure_telegram_webhook() -> dict | None:
    if not settings.TELEGRAM_WEBHOOK_AUTO_SETUP:
        return None

    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("Telegram webhook auto-setup skipped: TELEGRAM_BOT_TOKEN is missing")
        return None

    if not settings.TELEGRAM_WEBHOOK_SECRET:
        logger.info("Telegram webhook auto-setup skipped: TELEGRAM_WEBHOOK_SECRET is missing")
        return None

    public_base_url = _get_public_base_url()
    if not public_base_url:
        logger.warning("Telegram webhook auto-setup skipped: no public base URL detected")
        return None

    webhook_url = f"{public_base_url}/api/integrations/telegram/webhook/{settings.TELEGRAM_WEBHOOK_SECRET}"
    result = _telegram_api_get(
        "setWebhook",
        {
            "url": webhook_url,
            "secret_token": settings.TELEGRAM_WEBHOOK_SECRET,
            "drop_pending_updates": str(settings.TELEGRAM_WEBHOOK_DROP_PENDING_UPDATES).lower(),
        },
    )
    logger.info("Telegram webhook auto-configured at %s", webhook_url)
    return result


def ensure_telegram_webhook_configured() -> dict | None:
    """Try multiple times so startup can handle delayed ngrok/public tunnel readiness."""
    if not settings.TELEGRAM_WEBHOOK_AUTO_SETUP:
        return None

    attempts = max(1, int(settings.TELEGRAM_WEBHOOK_SETUP_MAX_ATTEMPTS))
    retry_seconds = max(1, int(settings.TELEGRAM_WEBHOOK_SETUP_RETRY_SECONDS))

    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            result = auto_configure_telegram_webhook()
            if result is not None:
                return result
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Telegram webhook auto-setup attempt %s/%s failed: %s",
                attempt,
                attempts,
                exc,
            )

        if attempt < attempts:
            time.sleep(retry_seconds)

    if last_error:
        logger.error("Telegram webhook auto-setup exhausted retries: %s", last_error)
    else:
        logger.warning("Telegram webhook auto-setup exhausted retries without a public URL")
    return None


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
