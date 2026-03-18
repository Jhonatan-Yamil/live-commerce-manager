from datetime import datetime
from pydantic import BaseModel
from app.models.logistics import DeliveryType, DeliveryStatus


class LogisticsCreate(BaseModel):
    order_id: int
    delivery_type: DeliveryType = DeliveryType.pickup
    address: str | None = None


class LogisticsUpdate(BaseModel):
    delivery_status: DeliveryStatus | None = None
    address: str | None = None
    tracking_notes: str | None = None
    scheduled_at: datetime | None = None
    delivered_at: datetime | None = None


class LogisticsOut(BaseModel):
    id: int
    order_id: int
    delivery_type: DeliveryType
    delivery_status: DeliveryStatus
    address: str | None
    tracking_notes: str | None
    scheduled_at: datetime | None
    delivered_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}