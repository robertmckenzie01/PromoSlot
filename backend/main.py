"""PromoSlot API — application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (ensure models are registered on Base)
from .config import settings
from .db import Base, engine
from .routers import auth, connect, health, webhooks

# Create tables for local/dev. (Production will use migrations.)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PromoSlot API", version="0.1.0")

# Allow the frontend origin to call the API with credentials (cookies).
app.add_middleware(
    CORSMiddleware,
    allow_origins=list({settings.app_base_url, "http://localhost:8000", "http://127.0.0.1:8000"}),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(webhooks.router)
app.include_router(auth.router)
app.include_router(connect.router)


@app.get("/", tags=["root"])
def root():
    return {
        "service": "PromoSlot API",
        "version": app.version,
        "status": "ok",
        "stripe_configured": settings.stripe_configured,
    }
