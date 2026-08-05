"""PromoSlot API — application entry point."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (ensure models are registered on Base)
from .assets import render_index
from .config import settings
from .routers import (
    admin, auth, campaigns, connect, deals, health, messages, mfa, notifications,
    inbound, platforms, profiles, proofs, review, reviews, support, webhooks,
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")

# Schema is owned by Alembic migrations (SQLite in dev, Postgres in prod).
# Bring a database up to date with:  alembic upgrade head
# The app no longer creates tables at import time, so migrations are the single
# source of truth and schema changes never require dropping tables.

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
app.include_router(inbound.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(mfa.router)
app.include_router(connect.router)
app.include_router(deals.router)
app.include_router(proofs.router)
app.include_router(review.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(messages.router)
app.include_router(profiles.router)
app.include_router(support.router)
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

    # HEAD as well as GET: without it a HEAD would fall through to the mount
    # below and answer with the un-versioned file and a misleading ETag.
    @app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
    @app.api_route("/index.html", methods=["GET", "HEAD"], include_in_schema=False)
    def index():
        """index.html with a content hash injected on every script tag.

        Declared before the StaticFiles mount so it wins for these two paths.
        The HTML itself must never be served from cache without revalidating —
        it is what carries the current hashes, so a stale copy would keep
        pointing at the previous build's JavaScript and defeat the whole thing.
        The hashed asset URLs underneath are then safe to cache normally.
        """
        return HTMLResponse(
            render_index(FRONTEND_DIR),
            headers={"Cache-Control": "no-cache, must-revalidate"},
        )

    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
