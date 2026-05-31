from __future__ import annotations

import json
from typing import Any
from urllib import error, request

from app.core.config import settings


def _build_url(path: str) -> str:
    base_url = (settings.WHATSAPP_EVOLUTION_BASE_URL or "").rstrip("/")
    if not base_url:
        raise ValueError("WHATSAPP_EVOLUTION_BASE_URL no está configurado")
    normalized_path = path if path.startswith("/") else f"/{path}"
    return f"{base_url}{normalized_path}"


def post_json(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = _build_url(path)
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}

    if settings.WHATSAPP_EVOLUTION_API_KEY:
        headers["apikey"] = settings.WHATSAPP_EVOLUTION_API_KEY

    http_request = request.Request(url, data=data, headers=headers, method="POST")

    try:
        with request.urlopen(http_request, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise ValueError(f"Error consultando Evolution API: {exc.code} {details or exc.reason}") from exc
    except error.URLError as exc:
        raise ValueError(f"No se pudo conectar con Evolution API: {exc.reason}") from exc


def download_base64_from_media_message(instance_name: str, message: dict[str, Any], convert_to_mp4: bool = False) -> dict[str, Any]:
    if not instance_name:
        raise ValueError("No se pudo determinar el instanceName de WhatsApp")

    return post_json(
        f"/chat/getBase64FromMediaMessage/{instance_name}",
        {
            "message": message,
            "convertToMp4": convert_to_mp4,
        },
    )