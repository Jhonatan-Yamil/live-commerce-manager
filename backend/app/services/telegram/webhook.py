from __future__ import annotations

import logging
import time

from app.core.config import settings

from .http_client import telegram_api_get
from .public_url import get_public_base_url


logger = logging.getLogger(__name__)


def auto_configure_telegram_webhook() -> dict | None:
    if not settings.TELEGRAM_WEBHOOK_AUTO_SETUP:
        return None

    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("Telegram webhook auto-setup skipped: TELEGRAM_BOT_TOKEN is missing")
        return None

    if not settings.TELEGRAM_WEBHOOK_SECRET:
        logger.info("Telegram webhook auto-setup skipped: TELEGRAM_WEBHOOK_SECRET is missing")
        return None

    public_base_url = get_public_base_url()
    if not public_base_url:
        logger.warning("Telegram webhook auto-setup skipped: no public base URL detected")
        return None

    webhook_url = f"{public_base_url}/api/integrations/telegram/webhook/{settings.TELEGRAM_WEBHOOK_SECRET}"
    result = telegram_api_get(
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