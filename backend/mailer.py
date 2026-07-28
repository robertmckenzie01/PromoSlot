"""Transactional email via Resend.

Real delivery only: if RESEND_API_KEY isn't configured, send_email() reports
failure rather than pretending an email went out. Callers surface that honestly
instead of showing a fake "sent" message.
"""
import json
import urllib.error
import urllib.request

from .config import settings

_ENDPOINT = "https://api.resend.com/emails"


def send_email(to: str, subject: str, html: str, text: str = "") -> tuple:
    """Send one email. Returns (ok, detail). Never raises."""
    if not settings.email_configured:
        return False, "email_not_configured"
    payload = {"from": settings.mail_from, "to": [to], "subject": subject, "html": html}
    if text:
        payload["text"] = text
    req = urllib.request.Request(
        _ENDPOINT, data=json.dumps(payload).encode(), method="POST",
        headers={"Authorization": f"Bearer {settings.resend_api_key}",
                 "Content-Type": "application/json",
                 # An explicit User-Agent is required: the default urllib agent is
                 # rejected by the API's edge/WAF with a 403 (Cloudflare 1010).
                 "User-Agent": "PromoSlot/1.0 (+https://promoslot.app)",
                 "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = json.loads(r.read().decode() or "{}")
            return True, body.get("id", "sent")
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode()[:300]
        except Exception:
            detail = str(e)
        return False, f"resend_error_{e.code}: {detail}"
    except Exception as e:  # network/timeout
        return False, f"resend_unreachable: {e}"


def password_reset_email(reset_url: str) -> tuple:
    """(subject, html, text) for a password-reset message."""
    subject = "Reset your PromoSlot password"
    html = f"""
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">Reset your password</h2>
        <p style="color:#334155">We received a request to reset your PromoSlot password.
           Click the button below to choose a new one. This link expires in 1 hour
           and can only be used once.</p>
        <p style="margin:26px 0">
          <a href="{reset_url}" style="background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">
            Set a new password</a>
        </p>
        <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely
           ignore this email — your password won't change.</p>
        <p style="color:#94a3b8;font-size:12px;word-break:break-all">{reset_url}</p>
      </div>"""
    text = (f"Reset your PromoSlot password\n\n{reset_url}\n\n"
            "This link expires in 1 hour and can only be used once. "
            "If you didn't request it, ignore this email.")
    return subject, html, text
