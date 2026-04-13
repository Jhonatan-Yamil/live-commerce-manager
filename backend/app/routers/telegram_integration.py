from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.voucher_intake import VoucherSourceChannel
from app.schemas.voucher_intake import VoucherIntakeOut
from app.services.telegram_intake_service import (
    extract_message_file_info,
    build_upload_from_telegram_file,
)
from app.services.voucher_intake_service import create_intake_from_upload


router = APIRouter()


@router.post("/webhook/{secret}", response_model=VoucherIntakeOut | None)
def telegram_webhook(
    secret: str,
    update: dict,
    db: Session = Depends(get_db),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    if secret != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Webhook secret inválido")

    # Validación opcional del header de Telegram si se configura webhook con secret token.
    if x_telegram_bot_api_secret_token and x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Header secret token inválido")

    info = extract_message_file_info(update)
    if not info:
        return None

    try:
        upload = build_upload_from_telegram_file(
            file_id=info["file_id"],
            filename=info["filename"],
            mime_type=info.get("mime_type"),
        )
        return create_intake_from_upload(
            db,
            current_user=None,
            file=upload,
            source_channel=VoucherSourceChannel.telegram,
            external_chat_id=info.get("chat_id") or None,
            external_message_id=info.get("message_id") or None,
            sender_phone=info.get("sender_phone"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/health")
def telegram_integration_health():
    return {
        "telegram_token_configured": bool(settings.TELEGRAM_BOT_TOKEN),
        "webhook_secret_configured": bool(settings.TELEGRAM_WEBHOOK_SECRET),
    }
