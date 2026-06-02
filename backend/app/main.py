from fastapi.staticfiles import StaticFiles
import asyncio
import os
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, users, clients, products, orders, payments, lots, intake, delivery_schedules, cash_flow, whatsapp_integration
from app.routers import logistics as logistics_router
from app.services.intake_processing_service import process_intake_job
from app.services.intake_queue_service import start_intake_worker, stop_intake_worker
from app.services.whatsapp_sync_worker import whatsapp_sync_loop  # ← nuevo

app = FastAPI(
    title="OperaFlow",
    description="Sistema de gestión de ventas para comercio electrónico en transmisiones en vivo",
    version="1.0.0",
    redirect_slashes=False,
)

UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

allowed_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(logistics_router.router, prefix="/api/logistics", tags=["Logistics"])
app.include_router(lots.router, prefix="/api/lots", tags=["Lots"])
app.include_router(intake.router, prefix="/api/intake", tags=["Intake"])
app.include_router(delivery_schedules.router, prefix="/api/delivery-schedules", tags=["Delivery Schedules"])
app.include_router(cash_flow.router, prefix="/api/cash-flow", tags=["Cash Flow"])
app.include_router(whatsapp_integration.router, tags=["WhatsApp Integration"])

_whatsapp_sync_task = None


@app.on_event("startup")
async def on_startup():
    global _whatsapp_sync_task

    if settings.INTAKE_ASYNC_ENABLED and settings.INTAKE_WORKER_EMBEDDED:
        start_intake_worker(process_intake_job)

    _whatsapp_sync_task = asyncio.create_task(whatsapp_sync_loop())


@app.on_event("shutdown")
async def on_shutdown():
    global _whatsapp_sync_task

    if settings.INTAKE_ASYNC_ENABLED and settings.INTAKE_WORKER_EMBEDDED:
        stop_intake_worker()

    if _whatsapp_sync_task:
        _whatsapp_sync_task.cancel()
        try:
            await _whatsapp_sync_task
        except asyncio.CancelledError:
            pass


@app.get("/")
def root():
    return {"message": "OperaFlow API", "status": "running"}