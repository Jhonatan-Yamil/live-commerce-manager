from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel
from app.models.order import OrderStatus
from app.schemas.client import ClientOut


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    client_id: int
    notes: str | None = None
    items: list[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderOut(BaseModel):
    id: int
    client_id: int
    status: OrderStatus
    total: Decimal
    notes: str | None
    created_at: datetime
    updated_at: datetime | None
    client: ClientOut
    items: list[OrderItemOut]
    model_config = {"from_attributes": True}