from datetime import datetime
from pydantic import BaseModel
from app.models.voucher_intake import VoucherSourceChannel, VoucherMatchStatus


class VoucherIntakeOut(BaseModel):
    id: int
    source_channel: VoucherSourceChannel
    external_chat_id: str | None
    external_message_id: str | None
    sender_phone: str | None
    file_path: str
    mime_type: str | None

    extracted_amount: float | None
    extracted_date: datetime | None
    extracted_reference: str | None
    extracted_sender_name: str | None
    ocr_raw_text: str | None
    ocr_confidence: float | None

    match_status: VoucherMatchStatus
    matched_client_id: int | None
    matched_order_id: int | None
    created_order_id: int | None

    reviewed_by_user_id: int | None
    reviewed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
