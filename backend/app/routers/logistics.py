from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.schemas.logistics import LogisticsCreate, LogisticsUpdate, LogisticsOut
from app.services.logistics_service import (
    create_logistics as create_logistics_service,
    get_logistics as get_logistics_service,
    list_logistics as list_logistics_service,
    update_logistics as update_logistics_service,
)
from app.services.pdf_service import generate_remito_pdf
from app.models.order import Order
from app.models.delivery_schedule import DeliverySchedule
from app.routers.utils import require_found

router = APIRouter()


@router.post("/", response_model=LogisticsOut)
def create_logistics(
    data: LogisticsCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    logistics = create_logistics_service(db, data.model_dump(), user_id=current_user.id)
    if not logistics:
        raise HTTPException(status_code=400, detail="Logística ya existe para este pedido")
    return logistics


@router.get("/", response_model=list[LogisticsOut])
def list_logistics(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return list_logistics_service(db, user_id=current_user.id)


@router.get("/{logistics_id}", response_model=LogisticsOut)
def get_logistics(
    logistics_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    l = get_logistics_service(db, logistics_id, user_id=current_user.id)
    return require_found(l, "No encontrado")


@router.put("/{logistics_id}", response_model=LogisticsOut)
def update_logistics(
    logistics_id: int,
    data: LogisticsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    l = update_logistics_service(db, logistics_id, data.model_dump(exclude_unset=True), user_id=current_user.id)
    return require_found(l, "No encontrado")


@router.get("/delivery/{delivery_schedule_id}/remito.pdf")
def download_remito_pdf(
    delivery_schedule_id: int,
    orientation: str = "landscape",
    paper_size: str = "a4",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    delivery_schedule = db.query(DeliverySchedule).filter(
        DeliverySchedule.id == delivery_schedule_id,
        getattr(DeliverySchedule, "user_id") == current_user.id,
    ).first()
    if not delivery_schedule:
        raise HTTPException(status_code=404, detail="Entrega no encontrada")

    order = db.query(Order).options(
        joinedload(Order.client),
        joinedload(Order.items)
    ).filter(Order.id == delivery_schedule.order_id).first()
    if not order or getattr(order, "user_id", None) != current_user.id:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    try:
        pdf_bytes = generate_remito_pdf(order, delivery_schedule, orientation, paper_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=remito_{order.id}.pdf"}
    )