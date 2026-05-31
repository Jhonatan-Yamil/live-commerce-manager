from __future__ import annotations
from logging import info

from numpy import info
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User
from app.models.voucher_intake import VoucherSourceChannel
from app.schemas.voucher_intake import VoucherIntakeOut
from app.schemas.whatsapp_integration import WhatsAppIntegrationStateOut, WhatsAppIntakeToggleIn
from app.services.intake.file_storage import validate_mime_type
from app.services.voucher_intake_service import create_intake_from_upload
from app.services.whatsapp.file_download import build_upload_from_whatsapp_message
from app.services.whatsapp.message_info import extract_message_file_info
from app.services.whatsapp_session_service import (
    build_whatsapp_incoming_intake,
    connect_user_whatsapp,
    disconnect_user_whatsapp,
    get_user_whatsapp_status,
    resolve_webhook_user,
    set_user_whatsapp_intake_enabled,
)
from app.repositories import voucher_intake_repository


router = APIRouter(prefix="/api/integrations/whatsapp", tags=["whatsapp-integration"])


def _validate_whatsapp_webhook_secret(
    path_secret: str,
    x_whatsapp_webhook_secret: str | None = Header(default=None),
    x_evolution_webhook_secret: str | None = Header(default=None),
) -> None:
    configured_secret = settings.WHATSAPP_WEBHOOK_SECRET.strip()
    received_secrets = [secret for secret in [path_secret, x_whatsapp_webhook_secret, x_evolution_webhook_secret] if secret]

    if not configured_secret or configured_secret == "change-this-whatsapp-secret":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WHATSAPP_WEBHOOK_SECRET no está configurado",
        )

    if not any(secret == configured_secret for secret in received_secrets):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Webhook de WhatsApp no autorizado")


def _build_webhook_intake(db: Session, user: User, info: dict):
    message_id = info.get("message_id")
    if message_id:
        existing = voucher_intake_repository.get_by_external_message_id(db, message_id, user_id=user.id)
        if existing:
            return existing

    if not user.whatsapp_intake_enabled:
        upload = build_upload_from_whatsapp_message(info["message_payload"], info)
        validate_mime_type(upload.content_type)
        return create_intake_from_upload(
            db,
            user,
            file=upload,
            source_channel=VoucherSourceChannel.whatsapp,
            external_chat_id=info.get("chat_id"),
            external_message_id=info.get("message_id"),
            sender_phone=info.get("sender_phone"),
            source_instance_name=info.get("instance_name") or user.whatsapp_instance_name,
            source_caption=info.get("caption"),
            processing_status="ignored",
            processing_error="Comprobantes deshabilitados para este usuario",
            enqueue_processing=False,
        )

    return build_whatsapp_incoming_intake(db, user, info)

@router.post("/webhook/{secret}", response_model=VoucherIntakeOut | None)
def whatsapp_webhook(
    secret: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_whatsapp_webhook_secret: str | None = Header(default=None),
    x_evolution_webhook_secret: str | None = Header(default=None),
):
    _validate_whatsapp_webhook_secret(secret, x_whatsapp_webhook_secret, x_evolution_webhook_secret)

    
        
    user = resolve_webhook_user(db, payload)
    
    if not user:
        return None

    info = extract_message_file_info(payload)
    if not info:
        return None

    info["instance_name"] = info.get("instance_name") or user.whatsapp_instance_name
    return _build_webhook_intake(db, user, info)


@router.post("/webhook/{secret}/{event_path:path}", response_model=VoucherIntakeOut | None)
def whatsapp_webhook_event(
    secret: str,
    event_path: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_whatsapp_webhook_secret: str | None = Header(default=None),
    x_evolution_webhook_secret: str | None = Header(default=None),
):
    _validate_whatsapp_webhook_secret(secret, x_whatsapp_webhook_secret, x_evolution_webhook_secret)

    user = resolve_webhook_user(db, payload)
    if not user:
        return None

    info = extract_message_file_info(payload)
    if not info:
        return None

    info["instance_name"] = info.get("instance_name") or user.whatsapp_instance_name
    return _build_webhook_intake(db, user, info)


@router.get("/health")
def whatsapp_health():
    return {
        "status": "ok",
        "webhook_secret_configured": bool(settings.WHATSAPP_WEBHOOK_SECRET and settings.WHATSAPP_WEBHOOK_SECRET != "change-this-whatsapp-secret"),
        "evolution_base_url_configured": bool(settings.WHATSAPP_EVOLUTION_BASE_URL),
        "evolution_api_key_configured": bool(settings.WHATSAPP_EVOLUTION_API_KEY),
        "instance_name_configured": bool(settings.WHATSAPP_EVOLUTION_INSTANCE_NAME),
    }


@router.get("/status", response_model=WhatsAppIntegrationStateOut)
def whatsapp_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_whatsapp_status(db, current_user)


@router.post("/connect", response_model=WhatsAppIntegrationStateOut)
def whatsapp_connect(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return connect_user_whatsapp(db, current_user)


@router.post("/disconnect", response_model=WhatsAppIntegrationStateOut)
def whatsapp_disconnect(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return disconnect_user_whatsapp(db, current_user)


@router.patch("/intake-enabled", response_model=WhatsAppIntegrationStateOut)
def whatsapp_toggle_intake(
    data: WhatsAppIntakeToggleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return set_user_whatsapp_intake_enabled(db, current_user, data.enabled)
