from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class LotCreate(BaseModel):
    name: str
    brand: str
    total_units: int
    total_cost: Decimal
    notes: str | None = None


class LotUpdate(BaseModel):
    name: str | None = None
    brand: str | None = None
    total_units: int | None = None
    total_cost: Decimal | None = None
    notes: str | None = None


class LotOut(BaseModel):
    id: int
    name: str
    brand: str
    total_units: int
    total_cost: Decimal
    unit_cost: Decimal | None
    notes: str | None
    created_at: datetime
    units_sold: int = 0
    total_revenue: Decimal = Decimal("0")
    profit: Decimal = Decimal("0")
    units_remaining: int = 0
    model_config = {"from_attributes": True}