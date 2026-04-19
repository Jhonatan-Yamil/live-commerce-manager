import logging
import os

from app.core.config import settings

from .http_client import fetch_json


logger = logging.getLogger(__name__)


def get_ngrok_public_url() -> str | None:
    api_base = settings.NGROK_API_URL.rstrip("/")
    url = f"{api_base}/api/tunnels"
    try:
        payload = fetch_json(url, timeout=10)
    except Exception:
        return None

    tunnels = payload.get("tunnels") or []
    https_tunnel = next((t for t in tunnels if str(t.get("public_url", "")).startswith("https://")), None)
    if https_tunnel:
        return https_tunnel.get("public_url")

    http_tunnel = next((t for t in tunnels if str(t.get("public_url", "")).startswith("http://")), None)
    return http_tunnel.get("public_url") if http_tunnel else None


def get_public_base_url() -> str | None:
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

    ngrok_url = get_ngrok_public_url()
    if ngrok_url:
        return ngrok_url.rstrip("/")

    return None