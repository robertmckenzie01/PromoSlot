"""Standard TOTP (RFC 6238) + recovery codes — stdlib only, no new vendor.

Compatible with any authenticator app (Google Authenticator, 1Password, Authy):
SHA1, 6 digits, 30-second step. Secrets are base32 as those apps expect.
"""
import base64
import hashlib
import hmac
import os
import secrets
import struct
import time

DIGITS = 6
PERIOD = 30


def new_secret() -> str:
    """A fresh base32 TOTP secret (160-bit)."""
    return base64.b32encode(os.urandom(20)).decode("utf-8").rstrip("=")


def _code_at(secret: str, counter: int) -> str:
    pad = "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(secret.upper() + pad)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10 ** DIGITS)).zfill(DIGITS)


def now_code(secret: str) -> str:
    return _code_at(secret, int(time.time()) // PERIOD)


def verify(secret: str, code: str, window: int = 1) -> bool:
    """Check a submitted code, allowing +/- `window` steps for clock drift."""
    if not secret or not code:
        return False
    code = str(code).strip().replace(" ", "")
    if len(code) != DIGITS or not code.isdigit():
        return False
    counter = int(time.time()) // PERIOD
    for drift in range(-window, window + 1):
        if hmac.compare_digest(_code_at(secret, counter + drift), code):
            return True
    return False


def provisioning_uri(secret: str, account: str, issuer: str = "PromoSlot") -> str:
    """otpauth:// URI an authenticator app can scan or accept by hand."""
    from urllib.parse import quote
    label = quote(f"{issuer}:{account}")
    return (f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}"
            f"&algorithm=SHA1&digits={DIGITS}&period={PERIOD}")


# ---------------------------- recovery codes ----------------------------

def new_recovery_codes(n: int = 10) -> list:
    """Single-use backup codes, shown once at setup so a lost device can't lock
    the super-admin out permanently."""
    return ["-".join(secrets.token_hex(2) for _ in range(3)) for _ in range(n)]


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().lower().encode()).hexdigest()


def hash_codes(codes) -> list:
    return [hash_code(c) for c in codes]
