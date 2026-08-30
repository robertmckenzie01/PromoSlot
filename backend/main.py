"""PromoSlot API — application entry point."""
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware

from . import models  # noqa: F401  (ensure models are registered on Base)
from .assets import render_404, render_index
from .config import settings
from .csrf import CSRFMiddleware
from .routers import (
    admin, affiliate, affiliate_tracking, auth, businesses, campaigns, connect, deals, disputes,
    google_auth, health, ledger, marketing, messages, notifications, inbound, platforms, profiles,
    proofs, review, reviews, support, verification, webhooks,
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
# Double-submit CSRF check for every mutating request (see csrf.py). Runs on
# every route uniformly, including ones added later — nothing to remember to
# wire per-endpoint the way rate limiting is.
app.add_middleware(CSRFMiddleware)
# Compress every text response over 1KB (JSON API responses, HTML pages, and
# critically promoslot-app.js/index.html, which were being served completely
# uncompressed — ~425KB and ~230KB respectively on every single page load, no
# exceptions). This alone cuts that by roughly 70-80%, the single biggest
# page-weight win available without touching any actual content.
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def cache_versioned_assets(request: Request, call_next):
    """Let the browser skip the request entirely for unchanged assets.

    Every local <script src> in index.html carries a content hash query
    param (assets.py's versioned_html — "?v=<hash of the file's bytes>"),
    so a URL with a "v=" query param is only ever reachable while its
    content is exactly what it was when that HTML was rendered: any real
    change produces a different hash and thus a different URL. That makes
    it safe to tell the browser to cache the response forever rather than
    re-checking with the server on every load, unlike index.html itself,
    which correctly keeps its own no-cache header (see render_index) since
    it's what carries the current hash and must always be revalidated.
    """
    response = await call_next(request)
    if "v" in request.query_params:
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


@app.middleware("http")
async def force_https(request: Request, call_next):
    """Redirect http:// to https:// in production, safely.

    Deliberately checks the X-Forwarded-Proto header directly rather than
    request.url.scheme. Render (like most PaaS front doors) terminates TLS
    at its edge and forwards to this process over plain HTTP internally, so
    request.url.scheme reads "http" here regardless of what the browser
    actually used — trusting it would either never redirect anything, or
    (if uvicorn is told to trust the proxy) risk a redirect loop if that
    trust is ever misconfigured. Reading the header ourselves avoids both
    failure modes: if Render is already forcing HTTPS at the edge, this
    header will simply already say "https" and the redirect never fires —
    a harmless no-op backstop rather than a live requirement. Skipped
    entirely in dev (APP_BASE_URL not https), so localhost is unaffected.
    """
    if (settings.app_base_url.startswith("https")
            and request.headers.get("x-forwarded-proto") == "http"):
        return RedirectResponse(str(request.url.replace(scheme="https")), status_code=308)
    return await call_next(request)

@app.exception_handler(StarletteHTTPException)
async def custom_404_handler(request: Request, exc: StarletteHTTPException):
    """Branded 404 page for a real API 404 reached by direct browser
    navigation; JSON left untouched everywhere else.

    A GET to a completely unmatched path (dead/old/mistyped link, no route
    for it at all) never reaches this handler — Starlette's StaticFiles
    mount below is in `html=True` mode, which already auto-serves
    frontend/404.html for any path it can't resolve, before an exception
    even propagates this far. This handler covers the narrower remaining
    case: a route that DOES exist raising a real 404 (e.g. "Campaign not
    found" for a removed listing), reached by someone's browser navigating
    there directly rather than the app's own JS calling it. Real browser
    navigations send "text/html" in Accept; frontend/api.js's fetch() calls
    never do (default */*), so only that direct-navigation case gets the
    HTML page — every real API 404 read by the app's own JS keeps its
    plain JSON body untouched, since it parses `data.detail` from it to
    show the right message.
    """
    if (exc.status_code == 404
            and "text/html" in request.headers.get("accept", "")
            and os.path.isdir(FRONTEND_DIR)):
        try:
            return HTMLResponse(render_404(FRONTEND_DIR), status_code=404)
        except OSError:
            pass  # fall through to the plain JSON body below
    return JSONResponse(
        {"detail": exc.detail},
        status_code=exc.status_code,
        headers=getattr(exc, "headers", None),
    )


app.include_router(health.router)
app.include_router(webhooks.router)
app.include_router(inbound.router)
app.include_router(auth.router)
app.include_router(google_auth.router)
app.include_router(admin.router)
app.include_router(connect.router)
app.include_router(deals.router)
app.include_router(proofs.router)
app.include_router(review.router)
app.include_router(reviews.router)
app.include_router(notifications.router)
app.include_router(messages.router)
app.include_router(profiles.router)
app.include_router(marketing.router)
app.include_router(support.router)
app.include_router(platforms.router)
app.include_router(campaigns.router)
app.include_router(disputes.router)
app.include_router(ledger.router)
app.include_router(businesses.router)
app.include_router(verification.router)
app.include_router(affiliate.router)
app.include_router(affiliate_tracking.router)


@app.get("/api", tags=["root"])
def api_info():
    return {
        "service": "PromoSlot API",
        "version": app.version,
        "status": "ok",
        "stripe_configured": settings.stripe_configured,
    }


# Public/marketing routes get their own real URL, not just "/". Before this,
# the whole site was client-side-routed and never touched the URL bar, so
# only "/" was ever a real, crawlable, refreshable, shareable address —
# hitting /pricing or /about directly 404'd. Each of these now serves the
# same SPA shell (the client-side router still shows the right view once JS
# boots — see promoslot-app.js's popstate handling), but with the correct
# per-page <title>/description/canonical baked in server-side (assets.py's
# PAGE_META) so it's there unconditionally, not dependent on the app's JS
# finishing its boot. Keep this list in sync with PAGE_META's keys and with
# promoslot-app.js's ROUTE_PATHS. Authenticated app views (dashboard, a
# specific deal, account, admin, …) deliberately do NOT get a path here —
# they're behind a login wall and were never meant to be indexed.
PUBLIC_PAGES = ["", "marketplace", "how-it-works", "pricing",
                "payment-protection", "resources", "about",
                "terms", "privacy", "refund-policy"]

# Serve the front end same-origin as the API (so session cookies just work).
# Mounted LAST so all explicit API routes above take precedence; everything else
# (index.html, JS, assets) is served from the frontend/ directory.
if os.path.isdir(FRONTEND_DIR):

    def _index_response(path: str = "") -> HTMLResponse:
        """index.html with a content hash injected on every script tag, plus
        this path's <title>/meta baked in (see assets.render_index).

        The HTML itself must never be served from cache without revalidating —
        it is what carries the current hashes, so a stale copy would keep
        pointing at the previous build's JavaScript and defeat the whole thing.
        The hashed asset URLs underneath are then safe to cache normally.
        """
        return HTMLResponse(
            render_index(FRONTEND_DIR, path),
            headers={"Cache-Control": "no-cache, must-revalidate"},
        )

    def _make_page_route(path: str):
        # Bind `path` per-iteration (a closure over the loop variable would
        # otherwise have every route serve the LAST page's meta tags).
        def _route():
            return _index_response(path)
        return _route

    # HEAD as well as GET: without it a HEAD would fall through to the mount
    # below and answer with the un-versioned file and a misleading ETag.
    # Declared before the StaticFiles mount so these paths win over it.
    app.add_api_route("/", _make_page_route(""), methods=["GET", "HEAD"], include_in_schema=False)
    app.add_api_route("/index.html", _make_page_route(""), methods=["GET", "HEAD"], include_in_schema=False)
    for _page in PUBLIC_PAGES:
        if _page:  # "" (home) is already registered above at "/"
            app.add_api_route(f"/{_page}", _make_page_route(_page),
                              methods=["GET", "HEAD"], include_in_schema=False)

    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
