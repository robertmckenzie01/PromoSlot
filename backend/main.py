"""PromoSlot API — application entry point."""
from fastapi import FastAPI

from . import models  # noqa: F401  (ensure models are registered on Base)
from .config import settings
from .db import Base, engine
from .routers import health, webhooks

# Create tables for local/dev. (Production will use migrations.)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PromoSlot API", version="0.1.0")
app.include_router(health.router)
app.include_router(webhooks.router)


@app.get("/", tags=["root"])
def root():
    return {
        "service": "PromoSlot API",
        "version": app.version,
        "status": "ok",
        "stripe_configured": settings.stripe_configured,
    }
