import json
import urllib.parse
import urllib.request

from app.core.config import settings


def require_bot_token() -> str:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN no configurado")
    return token


def fetch_json(url: str, timeout: int) -> dict:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_bytes(url: str, timeout: int) -> bytes:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return response.read()


def telegram_api_get(path: str, params: dict | None = None) -> dict:
    token = require_bot_token()
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    url = f"https://api.telegram.org/bot{token}/{path}{query}"
    payload = fetch_json(url, timeout=20)

    if not payload.get("ok"):
        raise ValueError(f"Error API Telegram: {payload}")
    return payload["result"]


def download_telegram_file(file_path: str) -> bytes:
    token = require_bot_token()
    url = f"https://api.telegram.org/file/bot{token}/{file_path}"
    return fetch_bytes(url, timeout=30)