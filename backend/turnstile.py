"""Cloudflare Turnstile server-side verification (bot protection on signup).

Mirrors mailer.py's style: plain urllib, no new dependency. The widget on the
signup form (frontend/promoslot-app.js) produces a one-time token; this
exchanges it with Cloudflare's siteverify endpoint to confirm a real browser
solved the challenge, not a script hitting /auth/signup directly.

If TURNSTILE_SECRET_KEY isn't set (local dev), verification short-circuits to
True so nobody is blocked without a key configured — real enforcement only
turns on once settings.turnstile_configured is true, same pattern as
email_configured / stripe_configured elsewhere in config.py.
"""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from .config import settings

log = logging.getLogger(__name__)

_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str, remote_ip: str = "") -> bool:
    """True if `token` is a valid, unused Turnstile solution. Never raises —
    a Cloudflare-side outage or network hiccup fails closed (returns False)
    only when a key IS configured; see the short-circuit above for the
    unconfigured case."""
    if not settings.turnstile_configured:
        return True
    if not token:
        return False
    payload = {"secret": settings.turnstile_secret_key, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip
    data = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(_VERIFY_URL, data=data, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read().decode() or "{}")
            return bool(body.get("success"))
    except urllib.error.HTTPError as e:
        log.warning("turnstile siteverify http error: %s", e.code)
        return False
    except Exception as e:  # network/timeout/parse
        log.warning("turnstile siteverify unreachable: %s", e)
        return False
