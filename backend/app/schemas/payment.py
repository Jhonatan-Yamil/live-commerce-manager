from datetime import datetime
from pydantic import BaseModel
from app.models.payment import PaymentStatus


class PaymentCreate(BaseModel):
    order_id: int
    voucher_path: str | None = None
    notes: str | None = None


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus
    notes: str | None = None


class PaymentOut(BaseModel):
    id: int
    order_id: int
    status: PaymentStatus
    voucher_path: str | None
    notes: str | None
    reviewed_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}