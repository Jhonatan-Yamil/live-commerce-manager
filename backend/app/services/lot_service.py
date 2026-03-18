from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.lot import Lot
from app.models.order import OrderItem
from app.schemas.lot import LotCreate, LotUpdate, LotOut


def calculate_unit_cost(total_cost: Decimal, total_units: int) -> Decimal:
    if total_units > 0:
        return round(total_cost / total_units, 2)
    return Decimal("0")


def create_lot(db: Session, data: LotCreate) -> Lot:
    unit_cost = calculate_unit_cost(data.total_cost, data.total_units)
    lot = Lot(
        name=data.name,
        brand=data.brand,
        total_units=data.total_units,
        total_cost=data.total_cost,
        unit_cost=unit_cost,
        notes=data.notes,
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return lot


def update_lot(db: Session, lot_id: int, data: LotUpdate) -> Lot:
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(lot, k, v)
    lot.unit_cost = calculate_unit_cost(lot.total_cost, lot.total_units)
    db.commit()
    db.refresh(lot)
    return lot


def get_lots_with_stats(db: Session):
    lots = db.query(Lot).all()
    result = []
    for lot in lots:
        items = db.query(OrderItem).filter(OrderItem.lot_id == lot.id).all()
        units_sold = sum(i.quantity for i in items)
        total_revenue = sum(i.subtotal for i in items)
        profit = total_revenue - lot.total_cost
        units_remaining = max(0, lot.total_units - units_sold)
        lot_out = LotOut(
            id=lot.id,
            name=lot.name,
            brand=lot.brand,
            total_units=lot.total_units,
            total_cost=lot.total_cost,
            unit_cost=lot.unit_cost,
            notes=lot.notes,
            created_at=lot.created_at,
            units_sold=units_sold,
            total_revenue=Decimal(str(total_revenue)),
            profit=Decimal(str(profit)),
            units_remaining=units_remaining,
        )
        result.append(lot_out)
    return result