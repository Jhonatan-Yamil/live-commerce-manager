from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus
from app.repositories import voucher_intake_repository
from app.services.intake.file_storage import (
    UPLOAD_DIR,
    compute_sha256,
    read_upload_bytes,
    save_uploaded_file,
    validate_extension,
    validate_file_size,
    validate_mime_type,
)
from app.services.intake.matching import (
    find_best_order_match,
    find_client_by_name,
    find_client_by_phone,
    find_existing_auto_base,
)
from app.services.intake.workflow import (
    build_pending_intake_payload,
    create_base_order,
    create_provisional_client,
    dispatch_intake_processing,
    mark_reviewed,
    register_and_confirm_payment,
    reset_intake_for_reprocess,
)


PENDING_ORDER_STATUSES = {
    OrderStatus.pending_payment,
    OrderStatus.payment_in_review,
    OrderStatus.payment_rejected,
}


def _validate_extension(filename: str) -> str:
    return validate_extension(filename)


def _validate_mime_type(mime_type: str | None) -> None:
    validate_mime_type(mime_type)


def _read_upload_bytes(file) -> bytes:
    return read_upload_bytes(file)


def _validate_file_size(content: bytes) -> None:
    validate_file_size(content, settings.INTAKE_MAX_FILE_SIZE_MB)


def _compute_sha256(content: bytes) -> str:
    return compute_sha256(content)


def _find_client_by_phone(db: Session, sender_phone: str | None):
    return find_client_by_phone(db, sender_phone)


def _find_client_by_name(db: Session, sender_name: str | None):
    return find_client_by_name(db, sender_name)


def _find_best_order_match(db: Session, client_id: int, extracted_amount):
    return find_best_order_match(db, client_id, extracted_amount)


def _find_existing_auto_base(db: Session, client_id: int, extracted_amount):
    return find_existing_auto_base(db, client_id, extracted_amount)


def _create_provisional_client(db: Session, intake):
    return create_provisional_client(db, intake)


def _create_base_order(db: Session, client_id: int, intake):
    return create_base_order(db, client_id, intake)


def _build_pending_intake_payload(
    *,
    source_channel: VoucherSourceChannel,
    external_chat_id: str | None,
    external_message_id: str | None,
    sender_phone: str | None,
    filename: str,
    mime_type: str | None,
    file_sha256: str,
    file_size_bytes: int,
) -> dict:
    return build_pending_intake_payload(
        source_channel=source_channel,
        external_chat_id=external_chat_id,
        external_message_id=external_message_id,
        sender_phone=sender_phone,
        filename=filename,
        mime_type=mime_type,
        file_sha256=file_sha256,
        file_size_bytes=file_size_bytes,
    )


def _dispatch_intake_processing(db: Session, intake):
    return dispatch_intake_processing(db, intake)


def _reset_intake_for_reprocess(intake) -> None:
    reset_intake_for_reprocess(intake)


def _register_and_confirm_payment(db: Session, order_id: int, intake, *, note: str) -> None:
    register_and_confirm_payment(db, order_id, intake, note=note)


def _mark_reviewed(intake, *, status: VoucherMatchStatus, current_user: User) -> None:
    mark_reviewed(intake, status=status, current_user=current_user)


def create_intake_from_upload(
    db: Session,
    current_user: User | None,
    *,
    file,
    source_channel: VoucherSourceChannel = VoucherSourceChannel.manual,
    external_chat_id: str | None = None,
    external_message_id: str | None = None,
    sender_phone: str | None = None,
):
    _validate_mime_type(file.content_type)
    ext = _validate_extension(file.filename)
    content = _read_upload_bytes(file)
    _validate_file_size(content)
    file_sha256 = _compute_sha256(content)
    file_size_bytes = len(content)

    if external_chat_id and external_message_id:
        existing_by_external = voucher_intake_repository.get_by_external_message(
            db,
            source_channel=source_channel,
            external_chat_id=external_chat_id,
            external_message_id=external_message_id,
        )
        if existing_by_external:
            return existing_by_external

    dedup_since = datetime.now(timezone.utc) - timedelta(hours=settings.INTAKE_HASH_DEDUP_WINDOW_HOURS)
    existing_by_hash = voucher_intake_repository.get_recent_by_hash(db, file_sha256=file_sha256, since=dedup_since)
    if existing_by_hash:
        return existing_by_hash

    filename = f"intake_{source_channel.value}_{int(datetime.now().timestamp())}{ext}"
    save_uploaded_file(filename, content)

    payload = _build_pending_intake_payload(
        source_channel=source_channel,
        external_chat_id=external_chat_id,
        external_message_id=external_message_id,
        sender_phone=sender_phone,
        filename=filename,
        mime_type=file.content_type,
        file_sha256=file_sha256,
        file_size_bytes=file_size_bytes,
    )
    intake = voucher_intake_repository.create_intake(db, payload)
    return _dispatch_intake_processing(db, intake)


def list_intakes(db: Session, status: VoucherMatchStatus | None = None, skip: int = 0, limit: int = 100):
    return voucher_intake_repository.list_intakes(db, status=status, skip=skip, limit=limit)


def get_intake(db: Session, intake_id: int):
    return voucher_intake_repository.get_by_id(db, intake_id)


def reprocess_intake(db: Session, intake_id: int):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None

    _reset_intake_for_reprocess(intake)
    intake = voucher_intake_repository.save(db, intake)
    return _dispatch_intake_processing(db, intake)


def attempt_match_intake(db: Session, intake_id: int):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None

    matched_client = _find_client_by_phone(db, intake.sender_phone)
    if not matched_client:
        matched_client = _find_client_by_name(db, intake.extracted_sender_name)
    intake.matched_client_id = matched_client.id if matched_client else None

    if matched_client:
        matched_order = _find_best_order_match(db, matched_client.id, intake.extracted_amount)
        if matched_order:
            intake.matched_order_id = matched_order.id
            intake.created_order_id = None
            intake.match_status = VoucherMatchStatus.suggested
        else:
            intake.created_order_id = None
            intake.matched_order_id = None
            intake.match_status = VoucherMatchStatus.pending
    else:
        intake.matched_client_id = None
        intake.created_order_id = None
        intake.matched_order_id = None
        intake.match_status = VoucherMatchStatus.pending

    intake.reviewed_by_user_id = None
    intake.reviewed_at = None
    return voucher_intake_repository.save(db, intake)


def confirm_intake_match(db: Session, intake_id: int, current_user: User):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None
    if not intake.matched_order_id:
        raise ValueError("No hay pedido sugerido para confirmar")

    _register_and_confirm_payment(
        db,
        intake.matched_order_id,
        intake,
        note="Confirmado desde intake automático",
    )

    _mark_reviewed(intake, status=VoucherMatchStatus.confirmed, current_user=current_user)
    return voucher_intake_repository.save(db, intake)


def reject_intake_match(db: Session, intake_id: int, current_user: User):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None
    _mark_reviewed(intake, status=VoucherMatchStatus.rejected, current_user=current_user)
    return voucher_intake_repository.save(db, intake)


def reassign_intake_match(db: Session, intake_id: int, order_id: int, current_user: User):
    intake = voucher_intake_repository.get_by_id(db, intake_id)
    if not intake:
        return None

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Pedido no encontrado")

    intake.matched_order_id = order.id
    intake.matched_client_id = order.client_id

    _register_and_confirm_payment(
        db,
        order.id,
        intake,
        note="Confirmado desde reasignación de intake",
    )

    _mark_reviewed(intake, status=VoucherMatchStatus.confirmed, current_user=current_user)
    return voucher_intake_repository.save(db, intake)
