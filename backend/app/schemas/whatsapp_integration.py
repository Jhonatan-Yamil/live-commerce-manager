from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserOut


class WhatsAppIntakeToggleIn(BaseModel):
    enabled: bool


class WhatsAppQrCodeOut(BaseModel):
    pairingCode: str | None = None
    code: str | None = None
    base64: str | None = None
    count: int | None = None


class WhatsAppIntegrationStateOut(BaseModel):
    instance_name: str
    status: str
    qrcode: str | None = None
    user: UserOut
    intake_enabled: bool
    connected_at: datetime | None = None
