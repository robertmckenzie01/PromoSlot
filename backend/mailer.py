"""Transactional email via Resend.

Real delivery only: if RESEND_API_KEY isn't configured, send_email() reports
failure rather than pretending an email went out. Callers surface that honestly
instead of showing a fake "sent" message.
"""
import html as html_module
import json
import re
import urllib.error
import urllib.request

from .config import settings

_ENDPOINT = "https://api.resend.com/emails"
# Inbound (received) mail is a separate collection from sent mail.
_RECEIVING_ENDPOINT = "https://api.resend.com/emails/receiving"


def _esc(v) -> str:
    """Escape submitter-supplied text before it goes into an HTML email."""
    return (str(v or "").replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def send_email(to: str, subject: str, html: str, text: str = "",
               from_override: str = None, reply_to: str = None) -> tuple:
    """Send one email. Returns (ok, detail). Never raises.

    from_override lets a specific flow send under its own address (support
    replies come from the support inbox, not the generic no-reply sender).
    Everything else keeps settings.mail_from.

    reply_to sets the Reply-To header, so a reply in the recipient's mail client
    goes somewhere we can route (see routers/inbound.py).
    """
    if not settings.email_configured:
        return False, "email_not_configured"
    payload = {"from": from_override or settings.mail_from,
               "to": [to], "subject": subject, "html": html}
    if reply_to:
        # Where a human reply should go — used by support replies to route the
        # answer back to its own ticket.
        payload["reply_to"] = reply_to
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
                  is_platform_owner: bool = False, verify_url: str = "") -> tuple:
    """(subject, html, text) welcoming a brand-new account.

    Says nothing about what the account has done — it has just been created.
    The only personalisation is the name they gave and the role(s) they picked
    at signup, both of which are real answers they supplied.

    When verify_url is given this doubles as the verification email: the account
    cannot be used until that link is clicked, so the link leads and the
    orientation follows. Sending a separate welcome alongside it would land two
    near-identical mails at once and bury the one that matters.
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

    verify_block = f"""
        <p style="color:#334155">First, confirm this is your email address:</p>
        <p style="margin:20px 0">
          <a href="{verify_url}" style="background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">
            Verify my email</a>
        </p>
        <p style="color:#64748b;font-size:13px">The link works once and expires in
           24 hours. You'll be signed in as soon as you use it.</p>
        <p style="color:#94a3b8;font-size:12px;word-break:break-all">{verify_url}</p>
      """ if verify_url else ""

    html = f"""
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">{hello}</h2>
        <p style="color:#334155">Your account is ready. PromoSlot connects businesses with
           the people who own the audiences — and holds the money pending verification until the
           work is delivered and confirmed, so neither side has to trust the other up front.</p>
        {verify_block}
        <h3 style="color:#0f172a;font-size:15px;margin-bottom:8px">Then, where to start</h3>
        <ul style="padding-left:18px;margin:0">{items}</ul>
        {"" if verify_url else f'''<p style="margin:26px 0">
          <a href="{settings.app_base_url}" style="background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">
            Open PromoSlot</a>
        </p>'''}
        <p style="color:#64748b;font-size:13px">Fees are only charged when a deal completes —
           10% from the seller, 5% buyer protection from the buyer. Nothing is charged for
           creating an account or publishing.</p>
      </div>"""

    text_steps = "\n".join(f"- {t}: {d}" for t, d in steps)
    verify_text = (f"First, confirm this is your email address:\n{verify_url}\n"
                   "The link works once and expires in 24 hours. You'll be signed in as "
                   "soon as you use it.\n\n") if verify_url else ""
    text = (f"{hello}\n\n"
            "Your account is ready. PromoSlot connects businesses with the people who own "
            "the audiences, and holds the money pending verification until the work is "
            f"delivered and confirmed.\n\n{verify_text}"
            f"{'Then, where' if verify_url else 'Where'} to start:\n"
            f"{text_steps}\n\n"
            f"{'' if verify_url else settings.app_base_url + chr(10) + chr(10)}"
            "Fees are only charged when a deal completes — 10% from the seller, 5% buyer "
            "protection from the buyer.")
    subject = ("Verify your email to finish setting up PromoSlot" if verify_url
               else "Welcome to PromoSlot")
    return subject, html, text


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
          Just reply to this email and it comes straight back to us on this
          ticket. Prefer to keep it in PromoSlot? Log in and reply from your
          Messages inbox instead — either reaches the same team.</p>
      </div>"""
    text = (f"Re: {subject}\n\n{reply}\n\n"
            "Just reply to this email and it comes straight back to us on this "
            "ticket. Prefer to keep it in PromoSlot? Log in and reply from your "
            "Messages inbox instead — either reaches the same team.")
    return f"Re: {subject}" if subject else "A reply from PromoSlot support", html, text


def fetch_received_email(email_id: str) -> tuple:
    """Retrieve an inbound email's actual content. Returns (ok, data_or_detail).

    The email.received webhook carries metadata only — sender, recipients,
    subject, ids — so the body has to be fetched separately with this call.

    Received mail lives under /emails/receiving/{id}, NOT /emails/{id} — the
    latter is the sent-message endpoint and would not resolve an inbound id.
    """
    if not settings.email_configured:
        return False, "email_not_configured"
    url = f"{_RECEIVING_ENDPOINT}/{email_id}"
    req = urllib.request.Request(url, method="GET", headers={
        "Authorization": f"Bearer {settings.resend_api_key}",
        "User-Agent": "PromoSlot/1.0 (+https://promoslot.app)",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return True, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            detail = e.read().decode()[:300]
        except Exception:
            detail = str(e)
        return False, f"resend_error_{e.code}: {detail}"
    except Exception as e:
        return False, f"resend_unreachable: {e}"


def extract_body(data: dict) -> str:
    """Pull readable text out of a retrieved email, whatever shape it arrives in.

    Prefers plain text; falls back to stripping tags from HTML. Tolerant of the
    field naming because the exact response shape is the part of this
    integration that could not be verified against a live account.
    """
    if not isinstance(data, dict):
        return ""
    for key in ("text", "plain", "body_text", "textBody"):
        v = data.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    for key in ("html", "body_html", "htmlBody", "body"):
        v = data.get(key)
        if isinstance(v, str) and v.strip():
            no_tags = re.sub(r"<br\s*/?>", "\n", v)
            no_tags = re.sub(r"</p>", "\n\n", no_tags)
            no_tags = re.sub(r"<[^>]+>", "", no_tags)
            return html_module.unescape(no_tags).strip()
    return ""


# Quoted-reply markers: everything from the first one onwards is the previous
# message being quoted back, not what the person actually wrote now.
_QUOTE_MARKERS = [
    re.compile(r"^\s*On .+ wrote:\s*$", re.M),
    re.compile(r"^\s*-{2,}\s*Original Message\s*-{2,}\s*$", re.M | re.I),
    re.compile(r"^\s*_{5,}\s*$", re.M),
    re.compile(r"^\s*From:\s.+$", re.M),
]


def strip_quoted_reply(text: str) -> str:
    """Trim the quoted history off a reply, keeping what was newly written."""
    if not text:
        return ""
    cut = len(text)
    for pat in _QUOTE_MARKERS:
        m = pat.search(text)
        if m and m.start() < cut:
            cut = m.start()
    trimmed = text[:cut]
    # Drop trailing "> quoted" lines the markers didn't catch.
    lines = [l for l in trimmed.splitlines()]
    while lines and (not lines[-1].strip() or lines[-1].lstrip().startswith(">")):
        lines.pop()
    return "\n".join(lines).strip() or text.strip()


def _account_action_email(kind: str, reason: str = "") -> tuple:
    """Shared body for the suspension/ban notices.

    kind: "suspended" (reversible) | "banned" (permanent). The reason is what the
    admin actually typed — never embellished, and never omitted, because the
    login screen only shows a generic message and this is the one place the
    person is told why.
    """
    banned = kind == "banned"
    title = "Your PromoSlot account has been banned" if banned else \
            "Your PromoSlot account has been suspended"
    lead = ("Your account has been banned and can no longer be used. This is "
            "permanent, and the email address cannot be used to sign up again."
            if banned else
            "Your account has been suspended, so you can't sign in or trade for "
            "now. A suspension can be lifted.")
    reason_block = (f'''
        <p style="color:#334155;margin-bottom:6px"><b>Reason given</b></p>
        <div style="border-left:3px solid #4f46e5;padding:2px 0 2px 14px;color:#334155;
                    white-space:pre-wrap;font-size:14px">{_esc(reason)}</div>'''
        if reason else
        '''<p style="color:#64748b;font-size:13px">No reason was recorded.</p>''')

    html = f"""
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">{title}</h2>
        <p style="color:#334155">{lead}</p>
        {reason_block}
        <p style="color:#334155;margin-top:22px">Any funds already held for a deal in
           progress are unaffected by this and still follow the normal
           verification and payout process.</p>
        <p style="color:#64748b;font-size:13px">If you think this is a mistake, reply to
           this email or contact {settings.support_email} and a person will look at it.</p>
      </div>"""
    text = (f"{title}\n\n{lead}\n\n"
            + (f"Reason given:\n{reason}\n\n" if reason else "No reason was recorded.\n\n")
            + "Any funds already held for a deal in progress are unaffected and still "
              "follow the normal verification and payout process.\n\n"
              f"If you think this is a mistake, reply to this email or contact "
              f"{settings.support_email} and a person will look at it.")
    return title, html, text


def account_suspended_email(reason: str = "") -> tuple:
    """(subject, html, text) telling someone their account was suspended, and why."""
    return _account_action_email("suspended", reason)


def account_banned_email(reason: str = "") -> tuple:
    """(subject, html, text) telling someone their account was banned, and why."""
    return _account_action_email("banned", reason)


def account_restored_email(display_name: str = "") -> tuple:
    """(subject, html, text) telling someone their suspension has been lifted.

    Deliberately not built on _account_action_email: that one exists to deliver
    bad news precisely, and this is the opposite errand. No reason block — the
    restore is the whole message — and it ends on a way back in rather than on
    an appeals address.
    """
    name = (display_name or "").strip()
    hello = f"Welcome back, {name}" if name else "Welcome back"
    hello_html = f"Welcome back, {_esc(name)}" if name else "Welcome back"
    title = "Your account is active again — welcome back"
    url = settings.app_base_url

    html = f"""
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
        <h2 style="color:#0f172a">{hello_html}</h2>
        <p style="color:#334155">The suspension on your PromoSlot account has been
           lifted. You can sign in again, and everything is where you left it —
           your profile, your listings and campaigns, and any deals in progress.</p>
        <p style="margin:22px 0">
          <a href="{url}" style="background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:700;display:inline-block">
            Sign in to PromoSlot</a>
        </p>
        <p style="color:#334155">It's good to have you back. If anything looks off
           when you sign in, {settings.support_email} will sort it out.</p>
        <p style="color:#94a3b8;font-size:12px;word-break:break-all">{url}</p>
      </div>"""
    text = (f"{hello}\n\n"
            "The suspension on your PromoSlot account has been lifted. You can sign "
            "in again, and everything is where you left it — your profile, your "
            "listings and campaigns, and any deals in progress.\n\n"
            f"Sign in: {url}\n\n"
            "It's good to have you back. If anything looks off when you sign in, "
            f"{settings.support_email} will sort it out.")
    return title, html, text
