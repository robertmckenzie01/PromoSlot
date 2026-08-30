"""Lightweight rate limiting for public, unauthenticated endpoints.

No Redis or third-party dependency — a per-process sliding-window counter
keyed by client IP + route. The app runs as a single instance today, so
in-memory state is fine; if PromoSlot ever scales to multiple instances
behind a load balancer, swap `_hits` for a Redis-backed store without
touching any call site (the `rate_limit()` signature stays the same).

This exists to stop the obvious abuse cases on endpoints that don't require
a login: hammering /auth/signup to create junk accounts, spamming a real
person's inbox via /auth/forgot-password or /auth/resend-verification, or
flooding the support inbox via /support. It is deliberately simple — a real
bot/CAPTCHA layer (task: "Bot protection + CSRF hardening") is the next
step up from this, not a replacement for it.
"""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_hits: dict = defaultdict(deque)


def client_ip(request: Request) -> str:
    """Best-effort real client IP behind Render's proxy.

    Render (and most PaaS front doors) terminate TLS and forward the original
    client address in X-Forwarded-For — trust the first hop of that chain.
    Falls back to the direct connection for local/dev, where there's no proxy.
    """
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request, bucket: str, limit: int, window_seconds: int) -> None:
    """Raise 429 once `bucket` has been hit `limit` times within the trailing
    `window_seconds`. `bucket` should already include the route name and the
    client IP (see the wrapper functions below) so different endpoints and
    different callers never share a counter."""
    key = f"{bucket}:{client_ip(request)}"
    now = time.monotonic()
    q = _hits[key]
    cutoff = now - window_seconds
    while q and q[0] < cutoff:
        q.popleft()
    if len(q) >= limit:
        retry_after = max(1, int(window_seconds - (now - q[0])))
        raise HTTPException(
            status_code=429,
            detail="Too many requests — please wait a moment and try again.",
            headers={"Retry-After": str(retry_after)},
        )
    q.append(now)


# ---------------------------------------------------------------- endpoint presets
# Each is a plain FastAPI dependency (`Depends(limit_x)`) so it composes with
# the rest of a route's existing Depends() list — no decorator, no middleware
# ordering to reason about.

def limit_signup(request: Request) -> None:
    rate_limit(request, "signup", limit=6, window_seconds=10 * 60)


def limit_login(request: Request) -> None:
    rate_limit(request, "login", limit=15, window_seconds=10 * 60)


def limit_password_reset_request(request: Request) -> None:
    rate_limit(request, "forgot-password", limit=5, window_seconds=15 * 60)


def limit_verification_resend(request: Request) -> None:
    rate_limit(request, "resend-verification", limit=5, window_seconds=15 * 60)


def limit_password_reset_submit(request: Request) -> None:
    rate_limit(request, "reset-password", limit=10, window_seconds=15 * 60)


def limit_support_ticket(request: Request) -> None:
    rate_limit(request, "support-ticket", limit=8, window_seconds=10 * 60)


def limit_google_oauth(request: Request) -> None:
    rate_limit(request, "google-oauth", limit=15, window_seconds=10 * 60)
