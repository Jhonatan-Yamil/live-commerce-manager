from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus
from app.schemas.voucher_intake import VoucherIntakeOut
from app.services.voucher_intake_service import create_intake_from_upload, list_intakes as list_intakes_service


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
