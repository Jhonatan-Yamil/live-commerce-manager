from datetime import date, datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from app.models.delivery_schedule import DeliverySchedule, DeliveryScheduleStatus
from app.models.order import Order


def _clean_list(values) -> list[str] | None:
    if values is None:
        return None
    if not isinstance(values, (list, tuple)):
        return None
    cleaned = [str(item).strip() for item in values if str(item).strip()]
    return cleaned if cleaned else []


def _split_city_department(value: str | None) -> tuple[str | None, str | None]:
    raw = (value or "").strip()
    if not raw:
        return None, None

    for separator in ("/", "-"):
        parts = [part.strip() for part in raw.split(separator) if part.strip()]
        if len(parts) >= 2:
            return parts[0], parts[1]

    return raw, None


def _extract_delivery_location(schedule: DeliverySchedule) -> str | None:
    location = (schedule.location or "").strip()
    if location:
        return location

    delivery_location = (schedule.delivery_location or "").strip()
    if delivery_location:
        return delivery_location

    return None


def _normalize_other_city_label(destination_city: str | None, transport_companies: list[str] | None) -> str | None:
    city = (destination_city or "").strip()
    carriers = _clean_list(transport_companies) or []
    if not city and not carriers:
        return None

    parts = ["Otra ciudad/departamento"]
    if city:
        parts.append(city)
    if carriers:
        parts.append(f"Transporte: {', '.join(carriers)}")
    return " - ".join(parts)


def _get_schedule_delivery_mode(schedule: DeliverySchedule, transport_companies: list[str] | None) -> str:
    explicit_mode = (getattr(schedule, "delivery_mode", None) or "").strip().lower()
    if explicit_mode in {"same_city", "other_city"}:
        return explicit_mode

    if transport_companies:
        return "other_city"

    delivery_location = (schedule.delivery_location or "").strip().lower()
    if delivery_location.startswith("otra ciudad/departamento"):
        return "other_city"

    return "same_city"


def _extract_destination_city(schedule: DeliverySchedule) -> str | None:
    destination_city = (schedule.destination_city or "").strip()
    if destination_city:
        return destination_city

    delivery_location = (schedule.delivery_location or "").strip()
    if not delivery_location.lower().startswith("otra ciudad/departamento"):
        return None

    parts = [part.strip() for part in delivery_location.split(" - ") if part.strip()]
    for part in parts[1:]:
        if not part.lower().startswith("transporte:"):
            return part

    return None


def _sync_client_delivery_data(db: Session, schedule: DeliverySchedule) -> None:
    order = db.query(Order).options(joinedload(Order.client)).filter(Order.id == schedule.order_id).first()
    if not order or not order.client:
        return

    client = order.client
    transport_companies = _clean_list(getattr(schedule, "transport_companies", None)) or []
    delivery_mode = _get_schedule_delivery_mode(schedule, transport_companies)

    client.delivery_mode = delivery_mode
    client.delivery_transport_companies = transport_companies

    if delivery_mode == "same_city":
        client.delivery_transport_companies = []
        location = (schedule.location or "").strip()
        if not location:
            dl = (schedule.delivery_location or "").strip()
            if not dl.lower().startswith("otra ciudad"):
                location = dl
        if location:
            client.address = location

    elif delivery_mode == "other_city":
        client.address = None  # o dejarlo como está, no poner el string largo
        destination_city = _extract_destination_city(schedule)
        if destination_city:
            city, department = _split_city_department(destination_city)
            if city:
                client.delivery_city = city
            client.delivery_department = department if department else city

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
        delivery_mode: str = None,
        transport_companies: list[str] | None = None,
        notes: str = None,
        user_id: int | None = None,
    ) -> DeliverySchedule:
        """Crear una nueva programación de entrega"""
        schedule = DeliverySchedule(
            order_id=order_id,
            scheduled_date=scheduled_date,
            delivery_location=delivery_location,
            location=location,
            destination_city=destination_city,
            delivery_mode=delivery_mode,
            transport_companies=_clean_list(transport_companies),
            status=DeliveryScheduleStatus.scheduled,
            notes=notes,
            user_id=user_id,
        )
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)
        return schedule
    
    def get_by_id(self, schedule_id: int, user_id: int | None = None) -> DeliverySchedule:
        """Obtener programación de entrega por ID"""
        q = self.db.query(DeliverySchedule).filter(DeliverySchedule.id == schedule_id)
        if user_id is not None:
            q = q.filter(getattr(DeliverySchedule, "user_id") == user_id)
        return q.first()

    def list_all(self, user_id: int | None = None) -> list[DeliverySchedule]:
        """Listar todas las programaciones de entrega"""
        q = self.db.query(DeliverySchedule).order_by(DeliverySchedule.created_at.desc())
        if user_id is not None:
            q = q.filter(getattr(DeliverySchedule, "user_id") == user_id)
        return q.all()
    
    def get_by_order_id(self, order_id: int, user_id: int | None = None) -> list[DeliverySchedule]:
        """Obtener todas las programaciones de entrega para una orden"""
        q = self.db.query(DeliverySchedule).filter(DeliverySchedule.order_id == order_id)
        if user_id is not None:
            q = q.join(Order, DeliverySchedule.order_id == Order.id).filter(Order.user_id == user_id)
        return q.all()

    def get_by_client_id(self, client_id: int, user_id: int | None = None) -> list[DeliverySchedule]:
        """Obtener programaciones de entrega asociadas a un cliente"""
        q = (
            self.db.query(DeliverySchedule)
            .join(Order, DeliverySchedule.order_id == Order.id)
            .filter(Order.client_id == client_id)
        )
        if user_id is not None:
            q = q.filter(Order.user_id == user_id)
        return q.order_by(DeliverySchedule.created_at.desc()).all()
    
    def get_scheduled_for_date(self, delivery_date: date, user_id: int | None = None) -> list[DeliverySchedule]:
        """Obtener todas las entregas programadas para una fecha específica"""
        q = self.db.query(DeliverySchedule).filter(
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
        )
        if user_id is not None:
            q = q.filter(getattr(DeliverySchedule, "user_id") == user_id)
        return q.all()
    
    def get_scheduled_for_date_with_order(self, delivery_date: date, user_id: int | None = None) -> list:
        """Obtener entregas programadas para una fecha con información de la orden"""
        q = self.db.query(DeliverySchedule, Order).join(Order).filter(
            and_(
                DeliverySchedule.scheduled_date == delivery_date,
                DeliverySchedule.status == DeliveryScheduleStatus.scheduled
            )
        )
        if user_id is not None:
            q = q.filter(Order.user_id == user_id)
        return q.all()
    
    def mark_as_delivered(self, schedule_id: int, notes: str = None, user_id: int | None = None):
        """Marcar una entrega como completada"""
        schedule = self.get_by_id(schedule_id, user_id=user_id)
        if schedule:
            schedule.status = DeliveryScheduleStatus.delivered
            if notes is not None:
                schedule.notes = notes
            _sync_client_delivery_data(self.db, schedule)

            self.db.commit()
            self.db.refresh(schedule)

        return schedule
    
    def mark_as_not_delivered(self, schedule_id: int, notes: str = None, user_id: int | None = None):
        schedule = self.get_by_id(schedule_id, user_id=user_id)
        if schedule:
            schedule.status = DeliveryScheduleStatus.not_delivered

            if notes is not None:
                schedule.notes = notes

            self.db.commit()
            self.db.refresh(schedule)

        return schedule
    
    def reschedule(self, schedule_id: int, new_date: date, notes: str = None, user_id: int | None = None) -> DeliverySchedule:
        """Reprogramar una entrega a otra fecha"""
        schedule = self.get_by_id(schedule_id, user_id=user_id)
        if schedule:
            schedule.status = DeliveryScheduleStatus.rescheduled
            schedule.rescheduled_date = new_date
            schedule.scheduled_date = new_date
            if notes:
                schedule.notes = notes
            self.db.commit()
            self.db.refresh(schedule)
        return schedule
    
    def update_delivery_location(self, schedule_id: int, new_location: str, user_id: int | None = None) -> DeliverySchedule:
        """Actualizar la locación de entrega"""
        schedule = self.get_by_id(schedule_id, user_id=user_id)
        if schedule:
            schedule.delivery_location = new_location
            self.db.commit()
            self.db.refresh(schedule)
        return schedule

    def update_delivery_details(self, schedule_id: int, payload: dict, user_id: int | None = None) -> DeliverySchedule:
        """Actualizar los detalles de entrega"""
        schedule = self.get_by_id(schedule_id, user_id=user_id)
        if schedule:
            if "delivery_location" in payload:
                schedule.delivery_location = payload.get("delivery_location")
            if "location" in payload:
                schedule.location = payload.get("location")
            if "destination_city" in payload:
                schedule.destination_city = payload.get("destination_city")
            if "delivery_mode" in payload:
                schedule.delivery_mode = payload.get("delivery_mode")
            if "transport_companies" in payload:
                schedule.transport_companies = _clean_list(payload.get("transport_companies"))
            if "notes" in payload:
                schedule.notes = payload.get("notes")
            self.db.commit()
            self.db.refresh(schedule)
        return schedule
    
    def delete(self, schedule_id: int, user_id: int | None = None) -> bool:
        """Eliminar una programación de entrega"""
        schedule = self.get_by_id(schedule_id, user_id=user_id)
        if schedule:
            self.db.delete(schedule)
            self.db.commit()
            return True
        return False
