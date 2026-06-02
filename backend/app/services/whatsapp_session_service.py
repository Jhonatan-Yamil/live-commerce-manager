from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.repositories.user_repository import get_by_whatsapp_instance_name
from app.services.whatsapp.evolution_client import EvolutionApiError, EvolutionWhatsAppClient


def _required_client() -> EvolutionWhatsAppClient:
    if not settings.WHATSAPP_EVOLUTION_BASE_URL or not settings.WHATSAPP_EVOLUTION_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Evolution API de WhatsApp no está configurada",
        )
    return EvolutionWhatsAppClient(settings.WHATSAPP_EVOLUTION_BASE_URL, settings.WHATSAPP_EVOLUTION_API_KEY)


def _default_instance_name(user: User) -> str:
    return f"live-commerce-user-{user.id}"


def ensure_user_instance_name(db: Session, user: User) -> str:
    if user.whatsapp_instance_name:
        return user.whatsapp_instance_name

    user.whatsapp_instance_name = _default_instance_name(user)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.whatsapp_instance_name


def _sync_user_state(db: Session, user: User, state: str | None, connected_at: datetime | None = None):
    user.whatsapp_instance_status = state
    if state == "open":
        user.whatsapp_connected_at = connected_at or user.whatsapp_connected_at or datetime.now(timezone.utc)
    elif state in {"close", "closed", "disconnected"}:
        user.whatsapp_connected_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_whatsapp_user_by_instance(db: Session, instance_name: str) -> User | None:
    return get_by_whatsapp_instance_name(db, instance_name)


def get_user_whatsapp_status(db: Session, user: User) -> dict:
    client = _required_client()
    instance_name = ensure_user_instance_name(db, user)

    try:
        response = client.connection_state(instance_name)
    except EvolutionApiError as exc:
        if exc.status_code in {400, 404}:
            _sync_user_state(db, user, "close", None)
            return {
                "instance_name": instance_name,
                "status": "close",
                "qrcode": None,
                "user": user,
                "intake_enabled": user.whatsapp_intake_enabled,
                "connected_at": user.whatsapp_connected_at,
            }
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    state = (
        response.get("instance", {}).get("state")
        or response.get("instance", {}).get("status")
        or response.get("status")
        or response.get("connectionStatus")
        or user.whatsapp_instance_status
        or "close"
    )
    qrcode = response.get("qrcode") or response.get("qrCode") or response.get("qr")
    _sync_user_state(db, user, str(state), datetime.now(timezone.utc) if str(state) == "open" else None)
    return {
        "instance_name": instance_name,
        "status": str(state),
        "qrcode": qrcode,
        "user": user,
        "intake_enabled": user.whatsapp_intake_enabled,
        "connected_at": user.whatsapp_connected_at,
    }


def connect_user_whatsapp(db: Session, user: User) -> dict:
    client = _required_client()
    instance_name = ensure_user_instance_name(db, user)

    try:
        current = client.connection_state(instance_name)
        state = (
            current.get("instance", {}).get("state")
            or current.get("instance", {}).get("status")
            or current.get("state")
            or current.get("connectionStatus")
            or "close"
        )
        if str(state) == "open":
            return get_user_whatsapp_status(db, user)
    except EvolutionApiError as exc:
        if exc.status_code not in {400, 404}:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
        try:
            client.create_instance(instance_name)
        except EvolutionApiError as create_exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(create_exc))

    if settings.WHATSAPP_WEBHOOK_PUBLIC_URL:
        try:
            client.set_webhook(instance_name, settings.WHATSAPP_WEBHOOK_PUBLIC_URL)
        except EvolutionApiError:
            pass

    try:
        response = client.connect_instance(instance_name)
    except EvolutionApiError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    qrcode = (
        response.get("qrcode")
        or response.get("qrCode")
        or response.get("qr")
        or response.get("code")
        or response.get("base64")
    )

    if isinstance(qrcode, dict):
        qrcode = qrcode.get("base64") or qrcode.get("code") or qrcode.get("qr")

    if qrcode is not None and not isinstance(qrcode, str):
        qrcode = str(qrcode)

    state = "connecting"
    _sync_user_state(db, user, state, None)

    return {
        "instance_name": instance_name,
        "status": state,
        "qrcode": qrcode,
        "user": user,
        "intake_enabled": user.whatsapp_intake_enabled,
        "connected_at": user.whatsapp_connected_at,
    }


def disconnect_user_whatsapp(db: Session, user: User) -> dict:
    client = _required_client()
    instance_name = ensure_user_instance_name(db, user)

    try:
        client.logout_instance(instance_name)
    except EvolutionApiError as exc:
        if exc.status_code not in {400, 404}:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    _sync_user_state(db, user, "close", None)
    return {
        "instance_name": instance_name,
        "status": "close",
        "qrcode": None,
        "user": user,
        "intake_enabled": user.whatsapp_intake_enabled,
        "connected_at": user.whatsapp_connected_at,
    }


def set_user_whatsapp_intake_enabled(db: Session, user: User, enabled: bool) -> dict:
    user.whatsapp_intake_enabled = enabled
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "instance_name": user.whatsapp_instance_name or _default_instance_name(user),
        "status": user.whatsapp_instance_status or "close",
        "qrcode": None,
        "user": user,
        "intake_enabled": user.whatsapp_intake_enabled,
        "connected_at": user.whatsapp_connected_at,
    }


def _extract_instance_candidates(payload: dict, fallback_instance_name: str | None = None) -> list[str]:
    candidates: list[str] = []

    def push(value: str | None):
        if not isinstance(value, str):
            return
        normalized = value.strip()
        if normalized and normalized not in candidates:
            candidates.append(normalized)

    if isinstance(payload, dict):
        root_instance = payload.get("instance")
        if isinstance(root_instance, str):
            push(root_instance)
        elif isinstance(root_instance, dict):
            push(root_instance.get("instanceName"))
            push(root_instance.get("instance_name"))
            push(root_instance.get("name"))

        push(payload.get("instanceName"))
        push(payload.get("instance_name"))

        data = payload.get("data") or {}
        if isinstance(data, dict):
            push(data.get("instanceName"))
            push(data.get("instance_name"))
            value = data.get("instance")
            if isinstance(value, str):
                push(value)
            elif isinstance(value, dict):
                push(value.get("instanceName"))
                push(value.get("instance_name"))
                push(value.get("name"))

    push(fallback_instance_name)
    return candidates


def resolve_webhook_user(db: Session, payload: dict, fallback_instance_name: str | None = None) -> User | None:
    candidates = _extract_instance_candidates(payload, fallback_instance_name)
    for instance_name in candidates:
        user = get_by_whatsapp_instance_name(db, instance_name)
        if user:
            return user
    return None

def build_whatsapp_incoming_intake(db: Session, user: User, info: dict):
    from app.models.voucher_intake import VoucherSourceChannel
    from app.services.intake.file_storage import validate_mime_type
    from app.services.voucher_intake_service import create_intake_from_upload
    from app.services.whatsapp.file_download import build_upload_from_whatsapp_message
    from app.services.whatsapp_intake_filter import pre_filter_whatsapp_image

    print(f"=== build_whatsapp_incoming_intake START: user={user.id}")

    if info.get("from_me"):
        print(f"=== ignorando mensaje propio")
        return None

    download_info = dict(info)
    download_info["instance_name"] = user.whatsapp_instance_name or info.get("instance_name")

    try:
        upload = build_upload_from_whatsapp_message(info["message_payload"], download_info)
        if not upload:
            return None
        validate_mime_type(upload.content_type)
    except Exception as exc:
        print(f"=== ERROR build_upload user={user.id}: {type(exc).__name__}: {exc}")
        return None

    # ── Pre-filtro antes de guardar ───────────────────────────────────────
    caption = info.get("caption")
    mime_type = upload.content_type

    image_bytes = None
    try:
        upload.file.seek(0)
        image_bytes = upload.file.read()
        upload.file.seek(0)
    except Exception:
        pass

    approved, reason = pre_filter_whatsapp_image(caption, mime_type, image_bytes)
    print(f"=== pre_filter: approved={approved}, reason={reason}")

    if not approved:
        print(f"=== descartado silenciosamente antes de guardar: {reason}")
        return None
    # ─────────────────────────────────────────────────────────────────────

    if not user.whatsapp_intake_enabled:
        print(f"=== intake deshabilitado para user={user.id}")
        return None

    result = create_intake_from_upload(
        db,
        user,
        file=upload,
        source_channel=VoucherSourceChannel.whatsapp,
        external_chat_id=info.get("chat_id"),
        external_message_id=info.get("message_id"),
        sender_phone=info.get("sender_phone"),
        source_instance_name=info.get("instance_name") or user.whatsapp_instance_name,
        source_caption=caption,
    )
    print(f"=== intake creado: id={result.id if result else None}")
    return result