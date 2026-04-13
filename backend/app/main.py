from fastapi.staticfiles import StaticFiles
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine
from app.database.schema_sync import ensure_voucher_intake_processing_columns
from app.models import base, user, client, product, order, payment, logistics, lot, voucher_intake
from app.routers import auth, users, clients, products, orders, payments, lots, intake, telegram_integration
from app.routers import logistics as logistics_router
from app.services.intake_processing_service import process_intake_job
from app.services.intake_queue_service import start_intake_worker, stop_intake_worker

base.Base.metadata.create_all(bind=engine)
ensure_voucher_intake_processing_columns(engine)

app = FastAPI(
    title="LiveSale Manager",
    description="Sistema de gestión de ventas para comercio electrónico en transmisiones en vivo",
    version="1.0.0",
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
app.include_router(telegram_integration.router, prefix="/api/integrations/telegram", tags=["Telegram Integration"])


@app.on_event("startup")
def on_startup():
    if settings.INTAKE_ASYNC_ENABLED and settings.INTAKE_WORKER_EMBEDDED:
        start_intake_worker(process_intake_job)


@app.on_event("shutdown")
def on_shutdown():
    if settings.INTAKE_ASYNC_ENABLED and settings.INTAKE_WORKER_EMBEDDED:
        stop_intake_worker()


@app.get("/")
def root():
    return {"message": "LiveSale Manager API", "status": "running"}