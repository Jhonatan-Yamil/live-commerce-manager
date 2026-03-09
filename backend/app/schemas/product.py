from decimal import Decimal
from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    price: Decimal
    stock: int = 0


class ProductUpdate(ProductCreate):
    is_active: bool | None = None


class ProductOut(BaseModel):
    id: int
    name: str
    description: str | None
    price: Decimal
    stock: int
    is_active: bool
    model_config = {"from_attributes": True}