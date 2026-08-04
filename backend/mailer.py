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


def _esc(v) -> str:
    """Escape submitter-supplied text before it goes into an HTML email."""
    return (str(v or "").replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


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


def welcome_email(display_name: str = "", is_business: bool = False,
                  is_platform_owner: bool = False) -> tuple:
    """(subject, html, text) welcoming a brand-new account.

    Says nothing about what the account has done — it has just been created.
    The only personalisation is the name they gave and the role(s) they picked
    at signup, both of which are real answers they supplied.
    """
    name = (display_name or "").strip()
    hello = f"Welcome, {name}" if name else "Welcome to PromoSlot"

    steps = []
    if is_business:
        steps.append(("Publish your first campaign",
                      "Describe what you want promoted and the terms you're offering. "
                      "Platform owners can then apply to it."))
    if is_platform_owner:
        steps.append(("List your platform",
                      "Add your audience numbers, the services you offer and your prices, "
                      "so businesses can find you and buy directly."))
    steps.append(("Fill in your profile",
                  "Add a profile picture and a short 'who we are' — it's what the other "
                  "side sees before deciding to work with you."))

    items = "".join(
        f'<li style="margin-bottom:12px"><b style="color:#0f172a">{t}</b><br>'
        f'<span style="color:#334155">{d}</span></li>' for t, d in steps)

    html = f"""
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">{hello}</h2>
        <p style="color:#334155">Your account is ready. PromoSlot connects businesses with
           the people who own the audiences — and holds the money in escrow until the work
           is delivered and verified, so neither side has to trust the other up front.</p>
        <h3 style="color:#0f172a;font-size:15px;margin-bottom:8px">Where to start</h3>
        <ul style="padding-left:18px;margin:0">{items}</ul>
        <p style="margin:26px 0">
          <a href="{settings.app_base_url}" style="background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">
            Open PromoSlot</a>
        </p>
        <p style="color:#64748b;font-size:13px">Fees are only charged when a deal completes —
           10% from the seller, 5% buyer protection from the buyer. Nothing is charged for
           creating an account or publishing.</p>
      </div>"""

    text_steps = "\n".join(f"- {t}: {d}" for t, d in steps)
    text = (f"{hello}\n\n"
            "Your account is ready. PromoSlot connects businesses with the people who own "
            "the audiences, and holds the money in escrow until the work is delivered and "
            "verified.\n\nWhere to start:\n"
            f"{text_steps}\n\n{settings.app_base_url}\n\n"
            "Fees are only charged when a deal completes — 10% from the seller, 5% buyer "
            "protection from the buyer.")
    return "Welcome to PromoSlot", html, text


def support_ticket_email(ticket_id: int, name: str, email: str = "", mobile: str = "",
                         subject: str = "", body: str = "") -> tuple:
    """(subject, html, text) alerting the support inbox to a new ticket."""
    def row(label, value):
        return (f'<tr><td style="padding:4px 12px 4px 0;color:#64748b;'
                f'vertical-align:top;white-space:nowrap">{label}</td>'
                f'<td style="padding:4px 0;color:#0f172a">{_esc(value or "—")}</td></tr>')

    html = f"""
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <h2 style="color:#0f172a">New support ticket #{ticket_id}</h2>
        <table style="border-collapse:collapse;font-size:14px;margin-bottom:18px">
          {row("From", name)}{row("Email", email)}{row("Mobile", mobile)}
          {row("Subject", subject)}
        </table>
        <div style="border-left:3px solid #4f46e5;padding:2px 0 2px 14px;color:#334155;
                    white-space:pre-wrap;font-size:14px">{_esc(body)}</div>
        <p style="color:#94a3b8;font-size:12px;margin-top:22px">
          Reply from the Contacted Support queue in PromoSlot so the reply is
          recorded against the ticket.</p>
      </div>"""
    text = (f"New support ticket #{ticket_id}\n\n"
            f"From: {name}\nEmail: {email or '—'}\nMobile: {mobile or '—'}\n"
            f"Subject: {subject}\n\n{body}\n")
    return f"[Support #{ticket_id}] {subject or 'New ticket'}", html, text


def support_reply_email(ticket_id: int, subject: str, reply: str) -> tuple:
    """(subject, html, text) for a reviewer's reply to the person who wrote in."""
    html = f"""
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">Re: {_esc(subject)}</h2>
        <div style="color:#334155;white-space:pre-wrap;font-size:14px">{_esc(reply)}</div>
        <p style="color:#64748b;font-size:13px;margin-top:22px">
          You can reply to this email and it will reach the PromoSlot support team.</p>
      </div>"""
    text = f"Re: {subject}\n\n{reply}\n\nYou can reply to this email to reach PromoSlot support."
    return f"Re: {subject}" if subject else "A reply from PromoSlot support", html, text
