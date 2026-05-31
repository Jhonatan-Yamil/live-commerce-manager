from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from app.core.config import settings


@dataclass
class EvolutionApiError(Exception):
    status_code: int | None
    detail: str

    def __str__(self) -> str:
        if self.status_code is None:
            return self.detail
        return f"{self.status_code}: {self.detail}"


class EvolutionWhatsAppClient:
    def __init__(self, base_url: str, api_key: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def _build_url(self, path: str) -> str:
        clean_path = path if path.startswith("/") else f"/{path}"
        return f"{self.base_url}{clean_path}"

    def _request_json(self, method: str, path: str, payload: dict[str, Any] | None = None):
        data = None
        headers = {"apikey": self.api_key}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = Request(self._build_url(path), data=data, headers=headers, method=method.upper())
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw_body = response.read().decode("utf-8")
                if not raw_body:
                    return None
                return json.loads(raw_body)
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            try:
                parsed = json.loads(body) if body else {}
            except Exception:
                parsed = {}
            detail = (
                parsed.get("message")
                or parsed.get("error")
                or parsed.get("detail")
                or body
                or exc.reason
                or "Error de Evolution API"
            )
            raise EvolutionApiError(exc.code, str(detail)) from exc
        except URLError as exc:
            raise EvolutionApiError(None, f"No fue posible conectar con Evolution API: {exc.reason}") from exc

    def create_instance(self, instance_name: str):
        return self._request_json(
            "POST",
            "/instance/create",
            payload={
                "instanceName": instance_name,
                "integration": settings.WHATSAPP_EVOLUTION_INTEGRATION,
                "qrcode": True,
            },
        )

    def connect_instance(self, instance_name: str):
        return self._request_json(
            "GET",
            f"/instance/connect/{instance_name}",
        )

    def connection_state(self, instance_name: str):
        return self._request_json(
            "GET",
            f"/instance/connectionState/{instance_name}",
        )

    def logout_instance(self, instance_name: str):
        return self._request_json(
            "DELETE",
            f"/instance/logout/{instance_name}",
        )

    def delete_instance(self, instance_name: str):
        return self._request_json(
            "DELETE",
            f"/instance/delete/{instance_name}",
        )
        
    def set_webhook(self, instance_name: str, webhook_url: str) -> dict:
        return self._request_json(
            "POST",
            f"/webhook/set/{instance_name}",
            payload={
                "webhook": {
                    "enabled": True,
                    "url": webhook_url,
                    "webhookByEvents": False,
                    "webhookBase64": True,
                    "events": ["MESSAGES_UPSERT"],
                }
            },
    )