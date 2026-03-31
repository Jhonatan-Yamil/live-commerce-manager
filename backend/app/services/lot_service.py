from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.lot import Lot
from app.schemas.lot import LotCreate, LotUpdate, LotOut
from app.repositories import lot_repository


def calculate_unit_cost(total_cost: Decimal, total_units: int) -> Decimal:
    if total_units > 0:
        return round(total_cost / total_units, 2)
    return Decimal("0")


def create_lot(db: Session, data: LotCreate) -> Lot:
    unit_cost = calculate_unit_cost(data.total_cost, data.total_units)
    return lot_repository.create_lot(
        db,
        {
            "name": data.name,
            "brand": data.brand,
            "total_units": data.total_units,
            "total_cost": data.total_cost,
            "unit_cost": unit_cost,
            "notes": data.notes,
        },
    )


def update_lot(db: Session, lot_id: int, data: LotUpdate) -> Lot:
    lot = lot_repository.get_lot_by_id(db, lot_id)
    if not lot:
        return None

    payload = data.model_dump(exclude_unset=True)
    total_cost = payload.get("total_cost", lot.total_cost)
    total_units = payload.get("total_units", lot.total_units)
    payload["unit_cost"] = calculate_unit_cost(total_cost, total_units)
    return lot_repository.update_lot(db, lot_id, payload)


def get_lot(db: Session, lot_id: int):
    return lot_repository.get_lot_by_id(db, lot_id)


def get_lots_with_stats(db: Session):
    lots = lot_repository.list_lots(db)
    result = []
    for lot in lots:
        items = lot_repository.list_order_items_by_lot(db, lot.id)
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