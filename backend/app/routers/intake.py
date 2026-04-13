from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus
from app.schemas.voucher_intake import VoucherIntakeOut, VoucherReassignIn
from app.services.voucher_intake_service import (
    create_intake_from_upload,
    list_intakes as list_intakes_service,
    attempt_match_intake,
    confirm_intake_match,
    reject_intake_match,
    reassign_intake_match,
    reprocess_intake,
)


router = APIRouter()


@router.post("/vouchers", response_model=VoucherIntakeOut)
def upload_voucher_intake(
    file: UploadFile = File(...),
    source_channel: VoucherSourceChannel = Form(VoucherSourceChannel.manual),
    external_chat_id: str | None = Form(None),
    external_message_id: str | None = Form(None),
    sender_phone: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return create_intake_from_upload(
            db,
            current_user,
            file=file,
            source_channel=source_channel,
            external_chat_id=external_chat_id,
            external_message_id=external_message_id,
            sender_phone=sender_phone,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/vouchers", response_model=list[VoucherIntakeOut])
def list_voucher_intakes(
    status: VoucherMatchStatus | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return list_intakes_service(db, status=status, skip=skip, limit=limit)


@router.post("/vouchers/{intake_id}/match", response_model=VoucherIntakeOut)
def match_voucher_intake(
    intake_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    intake = attempt_match_intake(db, intake_id)
    if not intake:
        raise HTTPException(status_code=404, detail="Comprobante intake no encontrado")
    return intake


@router.post("/vouchers/{intake_id}/confirm", response_model=VoucherIntakeOut)
def confirm_voucher_intake(
    intake_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        intake = confirm_intake_match(db, intake_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not intake:
        raise HTTPException(status_code=404, detail="Comprobante intake no encontrado")
    return intake


@router.post("/vouchers/{intake_id}/reject", response_model=VoucherIntakeOut)
def reject_voucher_intake(
    intake_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    intake = reject_intake_match(db, intake_id, current_user)
    if not intake:
        raise HTTPException(status_code=404, detail="Comprobante intake no encontrado")
    return intake


@router.post("/vouchers/{intake_id}/reassign", response_model=VoucherIntakeOut)
def reassign_voucher_intake(
    intake_id: int,
    data: VoucherReassignIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        intake = reassign_intake_match(db, intake_id, data.order_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not intake:
        raise HTTPException(status_code=404, detail="Comprobante intake no encontrado")
    return intake


@router.post("/vouchers/{intake_id}/reprocess", response_model=VoucherIntakeOut)
def reprocess_voucher_intake(
    intake_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    intake = reprocess_intake(db, intake_id)
    if not intake:
        raise HTTPException(status_code=404, detail="Comprobante intake no encontrado")
    return intake
