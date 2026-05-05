from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.delivery_schedule import DeliverySchedule, DeliveryScheduleStatus
from app.models.order import Order


class DeliveryScheduleRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def create_delivery_schedule(
        self,
        order_id: int,
        scheduled_date: date,
        delivery_location: str = None,
        location: str = None,
        destination_city: str = None,
        notes: str = None
    ) -> DeliverySchedule:
        """Crear una nueva programación de entrega"""
        schedule = DeliverySchedule(
            order_id=order_id,
            scheduled_date=scheduled_date,
            delivery_location=delivery_location,
            location=location,
            destination_city=destination_city,
            status=DeliveryScheduleStatus.scheduled,
            notes=notes
        )
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)
        return schedule
    
    def get_by_id(self, schedule_id: int) -> DeliverySchedule:
        """Obtener programación de entrega por ID"""
        return self.db.query(DeliverySchedule).filter(DeliverySchedule.id == schedule_id).first()

    def list_all(self) -> list[DeliverySchedule]:
        """Listar todas las programaciones de entrega"""
        return self.db.query(DeliverySchedule).order_by(DeliverySchedule.created_at.desc()).all()
    
    def get_by_order_id(self, order_id: int) -> list[DeliverySchedule]:
        """Obtener todas las programaciones de entrega para una orden"""
        return self.db.query(DeliverySchedule).filter(DeliverySchedule.order_id == order_id).all()

    def get_by_client_id(self, client_id: int) -> list[DeliverySchedule]:
        """Obtener programaciones de entrega asociadas a un cliente"""
        return (
            self.db.query(DeliverySchedule)
            .join(Order, DeliverySchedule.order_id == Order.id)
            .filter(Order.client_id == client_id)
            .order_by(DeliverySchedule.created_at.desc())
            .all()
        )
    
    def get_scheduled_for_date(self, delivery_date: date) -> list[DeliverySchedule]:
        """Obtener todas las entregas programadas para una fecha específica"""
        return self.db.query(DeliverySchedule).filter(
            and_(
                or_(
                    DeliverySchedule.scheduled_date == delivery_date,
                    DeliverySchedule.rescheduled_date == delivery_date,
                ),
                DeliverySchedule.status.in_([
                    DeliveryScheduleStatus.scheduled,
                    DeliveryScheduleStatus.rescheduled,
                ])
            )
        ).all()
    
    def get_scheduled_for_date_with_order(self, delivery_date: date) -> list:
        """Obtener entregas programadas para una fecha con información de la orden"""
        return self.db.query(DeliverySchedule, Order).join(Order).filter(
            and_(
                DeliverySchedule.scheduled_date == delivery_date,
                DeliverySchedule.status == DeliveryScheduleStatus.scheduled
            )
        ).all()
    
    def mark_as_delivered(self, schedule_id: int, notes: str = None) -> DeliverySchedule:
        """Marcar una entrega como completada"""
        schedule = self.get_by_id(schedule_id)
        if schedule:
            schedule.status = DeliveryScheduleStatus.delivered
            if notes:
                schedule.notes = notes
            self.db.commit()
            self.db.refresh(schedule)
        return schedule
    
    def mark_as_not_delivered(self, schedule_id: int, notes: str = None) -> DeliverySchedule:
        """Marcar una entrega como no completada"""
        schedule = self.get_by_id(schedule_id)
        if schedule:
            schedule.status = DeliveryScheduleStatus.not_delivered
            if notes:
                schedule.notes = notes
            self.db.commit()
            self.db.refresh(schedule)
        return schedule
    
    def reschedule(self, schedule_id: int, new_date: date, notes: str = None) -> DeliverySchedule:
        """Reprogramar una entrega a otra fecha"""
        schedule = self.get_by_id(schedule_id)
        if schedule:
            schedule.status = DeliveryScheduleStatus.rescheduled
            schedule.rescheduled_date = new_date
            schedule.scheduled_date = new_date
            if notes:
                schedule.notes = notes
            self.db.commit()
            self.db.refresh(schedule)
        return schedule
    
    def update_delivery_location(self, schedule_id: int, new_location: str) -> DeliverySchedule:
        """Actualizar la locación de entrega"""
        schedule = self.get_by_id(schedule_id)
        if schedule:
            schedule.delivery_location = new_location
            self.db.commit()
            self.db.refresh(schedule)
        return schedule
    
    def delete(self, schedule_id: int) -> bool:
        """Eliminar una programación de entrega"""
        schedule = self.get_by_id(schedule_id)
        if schedule:
            self.db.delete(schedule)
            self.db.commit()
            return True
        return False
