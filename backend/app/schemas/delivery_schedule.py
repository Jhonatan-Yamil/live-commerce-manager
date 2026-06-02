from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional


class DeliveryScheduleCreate(BaseModel):
    order_id: int = Field(..., description="ID de la orden")
    scheduled_date: date = Field(..., description="Fecha programada para entrega")
    delivery_location: Optional[str] = Field(None, description="Locación de entrega (ciudad, almacén, dirección)")
    location: Optional[str] = Field(None, description="Ubicación para entregas en la misma ciudad")
    destination_city: Optional[str] = Field(None, description="Ciudad destino para entregas en otra ciudad")
    delivery_mode: Optional[str] = Field(None, description="Modo de entrega: same_city u other_city")
    transport_companies: Optional[list[str]] = Field(None, description="Empresas de transporte para otras ciudades")
    notes: Optional[str] = Field(None, description="Notas sobre la entrega")


class DeliveryScheduleUpdate(BaseModel):
    delivery_location: Optional[str] = Field(None, description="Nueva locación de entrega")
    location: Optional[str] = Field(None, description="Ubicación para entregas en la misma ciudad")
    destination_city: Optional[str] = Field(None, description="Ciudad destino para entregas en otra ciudad")
    delivery_mode: Optional[str] = Field(None, description="Modo de entrega: same_city u other_city")
    transport_companies: Optional[list[str]] = Field(None, description="Empresas de transporte para otras ciudades")
    notes: Optional[str] = Field(None, description="Notas actualizadas")


class DeliveryScheduleMarkDelivered(BaseModel):
    notes: Optional[str] = Field(None, description="Notas sobre la entrega exitosa")


class DeliveryScheduleMarkNotDelivered(BaseModel):
    notes: Optional[str] = Field(None, description="Razón por la que no se entregó")


class DeliveryScheduleReschedule(BaseModel):
    new_date: date = Field(..., description="Nueva fecha de entrega")
    notes: Optional[str] = Field(None, description="Razón de la reprogramación")


class DeliveryScheduleResponse(BaseModel):
    id: int
    order_id: int
    scheduled_date: date
    delivery_location: Optional[str]
    location: Optional[str]
    destination_city: Optional[str]
    delivery_mode: Optional[str]
    transport_companies: Optional[list[str]]
    status: str
    rescheduled_date: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class DeliveryScheduleWithOrderResponse(BaseModel):
    id: int
    order_id: int
    scheduled_date: date
    delivery_location: Optional[str]
    location: Optional[str]
    destination_city: Optional[str]
    delivery_mode: Optional[str]
    transport_companies: Optional[list[str]]
    status: str
    rescheduled_date: Optional[date]
    notes: Optional[str]
    order: dict  # Cliente info, etc.

    class Config:
        from_attributes = True
