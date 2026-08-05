"""Svix webhook signature verification (standard library only).

Resend signs webhooks with Svix. Same posture as the Stripe receiver: an event
whose signature we cannot verify is refused rather than trusted.

The signed content is "{svix-id}.{svix-timestamp}.{raw body}", HMAC-SHA256 with
the secret, base64-encoded. The secret arrives as "whsec_<base64>"; the bytes
after the prefix are the key. svix-signature carries a space-separated list of
"v1,<sig>" entries (more than one during a secret rotation) — a match against
any of them is a pass.
"""
import base64
import hmac
import hashlib
import time

TOLERANCE_SECONDS = 5 * 60          # reject stale/replayed deliveries


class SignatureError(Exception):
    pass


def _key(secret: str) -> bytes:
    if not secret:
        raise SignatureError("no webhook secret configured")
    raw = secret.split("_", 1)[1] if secret.startswith("whsec_") else secret
    try:
        return base64.b64decode(raw)
    except Exception:
        raise SignatureError("malformed webhook secret")


def sign(secret: str, msg_id: str, timestamp: str, body: bytes) -> str:
    """The expected v1 signature — also used by the tests to build real headers."""
    signed = b".".join([msg_id.encode(), str(timestamp).encode(), body])
    mac = hmac.new(_key(secret), signed, hashlib.sha256).digest()
    return base64.b64encode(mac).decode()


def verify(secret: str, headers, body: bytes) -> None:
    """Raise SignatureError unless the delivery is authentic and recent."""
    msg_id = headers.get("svix-id") or headers.get("webhook-id")
    timestamp = headers.get("svix-timestamp") or headers.get("webhook-timestamp")
    signature = headers.get("svix-signature") or headers.get("webhook-signature")
    if not (msg_id and timestamp and signature):
        raise SignatureError("missing signature headers")

    try:
        sent_at = int(timestamp)
    except (TypeError, ValueError):
        raise SignatureError("bad timestamp")
    if abs(time.time() - sent_at) > TOLERANCE_SECONDS:
        raise SignatureError("timestamp outside tolerance")

    expected = sign(secret, msg_id, timestamp, body)
    for part in str(signature).split():
        _, _, candidate = part.partition(",")
        if candidate and hmac.compare_digest(candidate, expected):
            return
    raise SignatureError("no matching signature")
