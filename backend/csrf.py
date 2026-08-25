"""CSRF protection for state-changing requests (double-submit cookie).

Session auth uses a cookie (`ps_session`, httpOnly), and browsers attach
cookies automatically to ANY request to this origin — including one forged
by a malicious page on a different site. SameSite=Lax on the session cookie
already blocks the simplest cross-site form-POST case, and CORS being
locked to the real app origin blocks cross-origin fetch/XHR. This adds the
remaining, standard layer: a double-submit token.

How it works: a second cookie (`ps_csrf`) is set on first visit, NOT
httpOnly so our own frontend JS can read it, but unreadable by a different
origin (browsers enforce that regardless of SameSite). Every mutating
request must echo that same value back in an `X-CSRF-Token` header. A
forged cross-site request can make the browser SEND the cookie, but the
attacker's page can't READ its value to also set the matching header — so
the two values won't match and the request is rejected before it reaches
any route.

Exempt: GET/HEAD/OPTIONS (never mutate anything), /webhooks/* — those are
server-to-server calls from Stripe and Resend, never a browser, with no
cookies to forge and their own signature verification (see webhooks.py /
inbound.py) — and /marketing/cron/* for the same reason: it's called by an
external scheduler with no browser/cookies involved at all, authenticated
instead by a shared secret (see routers/marketing.py's cron_send_campaign).
"""
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from .config import settings

CSRF_COOKIE = "ps_csrf"
CSRF_HEADER = "x-csrf-token"
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
_EXEMPT_PREFIXES = ("/webhooks/", "/marketing/cron/")
_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days — matches the session cookie's lifetime


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cookie_token = request.cookies.get(CSRF_COOKIE)

        if (request.method not in _SAFE_METHODS
                and not request.url.path.startswith(_EXEMPT_PREFIXES)):
            header_token = request.headers.get(CSRF_HEADER)
            if not cookie_token or not header_token or not secrets.compare_digest(cookie_token, header_token):
                return JSONResponse(
                    {"detail": "Could not verify this request (missing or expired security "
                               "token). Refresh the page and try again."},
                    status_code=403,
                )

        response = await call_next(request)

        # Establish the cookie on first visit — always a safe (GET) request in
        # practice, since the browser loads index.html before any JS can fire
        # a mutating call. Re-issuing only when absent (not on every request)
        # keeps the token stable across a visit rather than churning it.
        if not cookie_token:
            response.set_cookie(
                key=CSRF_COOKIE,
                value=secrets.token_urlsafe(32),
                httponly=False,  # must be readable by our own frontend JS
                samesite="lax",
                secure=settings.app_base_url.startswith("https"),
                max_age=_COOKIE_MAX_AGE,
                path="/",
            )
        return response
