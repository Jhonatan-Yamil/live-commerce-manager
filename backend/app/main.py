from fastapi.staticfiles import StaticFiles
import os
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, users, clients, products, orders, payments, lots, intake, telegram_integration
from app.routers import logistics as logistics_router
from app.services.intake_processing_service import process_intake_job
from app.services.intake_queue_service import start_intake_worker, stop_intake_worker
from app.services.telegram_intake_service import ensure_telegram_webhook_configured

app = FastAPI(
    title="LiveSale Manager",
    description="Sistema de gestión de ventas para comercio electrónico en transmisiones en vivo",
    version="1.0.0",
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
app.include_router(telegram_integration.router, prefix="/api/integrations/telegram", tags=["Telegram Integration"])


@app.on_event("startup")
def on_startup():
    if settings.INTAKE_ASYNC_ENABLED and settings.INTAKE_WORKER_EMBEDDED:
        start_intake_worker(process_intake_job)

    threading.Thread(target=ensure_telegram_webhook_configured, daemon=True).start()


@app.on_event("shutdown")
def on_shutdown():
    if settings.INTAKE_ASYNC_ENABLED and settings.INTAKE_WORKER_EMBEDDED:
        stop_intake_worker()


@app.get("/")
def root():
    return {"message": "LiveSale Manager API", "status": "running"}