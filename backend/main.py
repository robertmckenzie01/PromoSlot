"""PromoSlot API — application entry point."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (ensure models are registered on Base)
from .config import settings
from .db import Base, engine
from .routers import (
    auth, campaigns, connect, deals, health, messages, notifications, platforms,
    proofs, review, reviews, webhooks,
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

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
app.include_router(deals.router)
app.include_router(proofs.router)
app.include_router(review.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(messages.router)
app.include_router(platforms.router)
app.include_router(campaigns.router)


@app.get("/api", tags=["root"])
def api_info():
    return {
        "service": "PromoSlot API",
        "version": app.version,
        "status": "ok",
        "stripe_configured": settings.stripe_configured,
    }


# Serve the front end same-origin as the API (so session cookies just work).
# Mounted LAST so all explicit API routes above take precedence; everything else
# (index.html, JS, assets) is served from the frontend/ directory.
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
