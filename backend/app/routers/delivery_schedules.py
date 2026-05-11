from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime
from app.database.session import get_db
from app.repositories.delivery_schedule_repository import DeliveryScheduleRepository
from app.schemas.delivery_schedule import (
    DeliveryScheduleCreate,
    DeliveryScheduleUpdate,
    DeliveryScheduleMarkDelivered,
    DeliveryScheduleMarkNotDelivered,
    DeliveryScheduleReschedule,
    DeliveryScheduleResponse,
)
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.logistics import Logistics, DeliveryStatus

router = APIRouter()


@router.get("/", response_model=list[DeliveryScheduleResponse])
def list_delivery_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Listar todas las programaciones de entrega"""
    repo = DeliveryScheduleRepository(db)
    return repo.list_all()


@router.post("/", response_model=DeliveryScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_delivery_schedule(
    payload: DeliveryScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crear una nueva programación de entrega para una orden"""
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    if order.status != OrderStatus.payment_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden programar pedidos con pago confirmado",
        )

    logistics = db.query(Logistics).filter(Logistics.order_id == payload.order_id).first()
    if logistics and logistics.delivery_status in {DeliveryStatus.sent, DeliveryStatus.delivered}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido ya fue enviado o entregado y no puede programarse",
        )

    repo = DeliveryScheduleRepository(db)
    schedule = repo.create_delivery_schedule(
        order_id=payload.order_id,
        scheduled_date=payload.scheduled_date,
        delivery_location=payload.delivery_location,
        location=payload.location,
        destination_city=payload.destination_city,
        notes=payload.notes,
    )
    return schedule


@router.get("/order/{order_id}", response_model=list[DeliveryScheduleResponse])
def get_delivery_schedules_by_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener todas las programaciones de entrega para una orden"""
    repo = DeliveryScheduleRepository(db)
    schedules = repo.get_by_order_id(order_id)
    return schedules


@router.get("/client/{client_id}", response_model=list[DeliveryScheduleResponse])
def get_delivery_schedules_by_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener todas las programaciones de entrega para un cliente"""
    repo = DeliveryScheduleRepository(db)
    schedules = repo.get_by_client_id(client_id)
    return schedules


@router.get("/today", response_model=list[DeliveryScheduleResponse])
def get_delivery_schedules_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener todas las entregas programadas para hoy"""
    repo = DeliveryScheduleRepository(db)
    today = date.today()
    schedules = repo.get_scheduled_for_date(today)
    return schedules


@router.get("/date/{delivery_date}", response_model=list[DeliveryScheduleResponse])
def get_delivery_schedules_by_date(
    delivery_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener todas las entregas programadas para una fecha específica"""
    repo = DeliveryScheduleRepository(db)
    schedules = repo.get_scheduled_for_date(delivery_date)
    return schedules


@router.patch("/{schedule_id}/delivered", response_model=DeliveryScheduleResponse)
def mark_delivery_as_delivered(
    schedule_id: int,
    payload: DeliveryScheduleMarkDelivered,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marcar una entrega como completada"""
    repo = DeliveryScheduleRepository(db)
    schedule = repo.mark_as_delivered(schedule_id, payload.notes)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programación de entrega no encontrada")
    return schedule


@router.patch("/{schedule_id}/not-delivered", response_model=DeliveryScheduleResponse)
def mark_delivery_as_not_delivered(
    schedule_id: int,
    payload: DeliveryScheduleMarkNotDelivered,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marcar una entrega como no completada"""
    repo = DeliveryScheduleRepository(db)
    schedule = repo.mark_as_not_delivered(schedule_id, payload.notes)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programación de entrega no encontrada")
    return schedule


@router.patch("/{schedule_id}/reschedule", response_model=DeliveryScheduleResponse)
def reschedule_delivery(
    schedule_id: int,
    payload: DeliveryScheduleReschedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reprogramar una entrega a otra fecha"""
    repo = DeliveryScheduleRepository(db)
    schedule = repo.reschedule(schedule_id, payload.new_date, payload.notes)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programación de entrega no encontrada")
    return schedule


@router.patch("/{schedule_id}/location", response_model=DeliveryScheduleResponse)
def update_delivery_location(
    schedule_id: int,
    payload: DeliveryScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualizar la locación de entrega"""
    if not payload.delivery_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="delivery_location es requerido"
        )
    repo = DeliveryScheduleRepository(db)
    schedule = repo.update_delivery_location(schedule_id, payload.delivery_location)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programación de entrega no encontrada")
    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_delivery_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Eliminar una programación de entrega"""
    repo = DeliveryScheduleRepository(db)
    success = repo.delete(schedule_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programación de entrega no encontrada")
