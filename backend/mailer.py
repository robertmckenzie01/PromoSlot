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
from datetime import datetime, timezone

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
        # Where a human reply should go, used by support replies to route the
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


# --------------------------------------------------------------------------
# Shared visual shell
#
# All 11 templates below render into this one shell so every PromoSlot email
# (including the suspension/ban/deletion notices) looks like it came from the
# same, competently-run company. Building blocks are kept as small functions
# rather than repeated inline HTML so a future visual tweak (a colour, a
# spacing value) only has to change in one place.
# --------------------------------------------------------------------------

_SANS = ("-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,"
         "Arial,sans-serif")
_SERIF = "Georgia,'Times New Roman',Times,serif"
_MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"


def _img_url(name: str) -> str:
    """Public URL for an email image asset served from frontend/img/email/."""
    return f"{settings.app_base_url}/img/email/{name}"


def _h1(inner_html: str) -> str:
    return (f'<h1 style="margin:0 0 18px;font-family:{_SERIF};font-size:27px;'
            f'line-height:1.28;font-weight:600;color:#14273f;'
            f'letter-spacing:-0.01em">{inner_html}</h1>')


def _lead(inner_html: str) -> str:
    return (f'<p style="margin:0 0 18px;font-family:{_SANS};font-size:17px;'
            f'line-height:1.6;color:#3a4658">{inner_html}</p>')


def _p(inner_html: str, margin: str = "0px 0 16px") -> str:
    return (f'<p style="margin:{margin};font-family:{_SANS};font-size:16px;'
            f'line-height:1.65;color:#3a4658">{inner_html}</p>')


def _fine(inner_html: str, margin: str = "22px 0 0") -> str:
    return (f'<p style="margin:{margin};font-family:{_SANS};font-size:13px;'
            f'line-height:1.6;color:#5f6e85">{inner_html}</p>')


def _url_line(url: str) -> str:
    return (f'<p style="margin:14px 0 0;font-family:{_MONO};font-size:12px;'
            f'line-height:1.5;color:#8291a6;word-break:break-all">{url}</p>')


def _eyebrow(text: str) -> str:
    return (f'<p style="margin:26px 0 8px;font-family:{_SANS};font-size:11px;'
            f'line-height:1;font-weight:700;letter-spacing:0.1em;'
            f'text-transform:uppercase;color:#8291a6">{text}</p>')


def _hr(margin: str = "24px 0 0") -> str:
    return (f'<div style="margin:{margin}"><table role="presentation" width="100%" '
            f'cellpadding="0" cellspacing="0" border="0"><tr><td height="1" '
            f'bgcolor="#e4e8ee" style="background:#e4e8ee;height:1px;line-height:1px;'
            f'font-size:0">&nbsp;</td></tr></table></div>')


def _button(url: str, label: str, margin: str = "28px 0 6px") -> str:
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
            f'style="margin:{margin}"><tr><td bgcolor="#4f46e5" '
            f'style="background:#4f46e5;border-radius:10px"><a href="{url}" '
            f'style="display:inline-block;padding:14px 26px;font-family:{_SANS};'
            f'font-size:15px;line-height:1;font-weight:700;color:#ffffff;'
            f'text-decoration:none;border-radius:10px">{label}</a></td></tr></table>')


def _quote(inner_html: str) -> str:
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'border="0" style="border-collapse:separate;margin:0 0 20px"><tr>'
            f'<td bgcolor="#f7f8fa" style="background:#f7f8fa;border-left:3px solid '
            f'#4f46e5;border-radius:0 8px 8px 0;padding:16px 18px;font-family:{_SANS};'
            f'font-size:15px;line-height:1.6;color:#3a4658;white-space:pre-wrap">'
            f'{inner_html}</td></tr></table>')


def _steps(items) -> str:
    rows = []
    for i, (title, desc) in enumerate(items, 1):
        rows.append(
            f'<tr><td width="26" valign="top" style="padding:0 0 16px;'
            f'font-family:{_SANS};font-size:13px;font-weight:700;line-height:1.7;'
            f'color:#4f46e5">{i}.</td><td valign="top" style="padding:0 0 16px">'
            f'<div style="font-family:{_SANS};font-size:15px;line-height:1.5;'
            f'font-weight:700;color:#14273f;margin-bottom:3px">{title}</div>'
            f'<div style="font-family:{_SANS};font-size:15px;line-height:1.6;'
            f'color:#3a4658">{desc}</div></td></tr>')
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'border="0" style="margin:0 0 4px">{"".join(rows)}</table>')


def _field_rows(pairs) -> str:
    rows = []
    for i, (label, value_html) in enumerate(pairs):
        top = "border-top:none;" if i == 0 else "border-top:1px solid #eef1f5;"
        pad_l = "0px 16px 10px 0" if i == 0 else "10px 16px 10px 0"
        pad_v = "0px 0 10px" if i == 0 else "10px 0 10px"
        rows.append(
            f'<tr><td width="90" valign="top" style="padding:{pad_l};{top}'
            f'font-family:{_SANS};font-size:11px;line-height:1.5;font-weight:700;'
            f'letter-spacing:0.08em;text-transform:uppercase;color:#8291a6;'
            f'white-space:nowrap">{label}</td><td valign="top" style="padding:{pad_v};'
            f'{top}font-family:{_SANS};font-size:15px;line-height:1.5;color:#14273f">'
            f'{value_html}</td></tr>')
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'border="0" style="margin:0 0 24px">{"".join(rows)}</table>')


def _hero(image_name: str, alt: str) -> str:
    url = _img_url(image_name)
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'border="0" style="margin:0 0 26px"><tr><td style="border-radius:10px;'
            f'overflow:hidden;line-height:0"><img src="{url}" width="568" alt="{alt}" '
            f'style="display:block;border:0;width:100%;max-width:568px;height:auto;'
            f'border-radius:10px"></td></tr></table>')


def _header() -> str:
    logo_1x, logo_2x = _img_url("logo.png"), _img_url("logo@2x.png")
    return (
        '<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid '
        '#e4e8ee;border-bottom:none;border-radius:14px 14px 0 0;padding:26px 36px '
        '22px"><table role="presentation" cellpadding="0" cellspacing="0" '
        f'border="0"><tr><td><img src="{logo_1x}" srcset="{logo_1x} 1x, {logo_2x} 2x" '
        'width="172" height="42" alt="PromoSlot" style="display:block;border:0;'
        'max-width:172px"></td></tr></table></td></tr>'
        '<tr><td bgcolor="#ffffff" style="background:#ffffff;border-left:1px solid '
        '#e4e8ee;border-right:1px solid #e4e8ee;padding:0 36px"><table '
        'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
        '<tr><td height="1" bgcolor="#e4e8ee" style="background:#e4e8ee;height:1px;'
        'line-height:1px;font-size:0">&nbsp;</td></tr></table></td></tr>'
    )


def _signature() -> str:
    """Option B: icon mark + "The PromoSlot Team", real selectable text, no tagline."""
    icon_1x, icon_2x = _img_url("icon-mark.png"), _img_url("icon-mark@2x.png")
    return (
        '<tr><td bgcolor="#ffffff" style="background:#ffffff;border-left:1px solid '
        '#e4e8ee;border-right:1px solid #e4e8ee;border-bottom:1px solid #e4e8ee;'
        'border-radius:0 0 14px 14px;padding:22px 36px 34px"><table '
        'role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
        f'<td width="40" valign="middle" style="padding-right:12px"><img '
        f'src="{icon_1x}" srcset="{icon_1x} 1x, {icon_2x} 2x" width="40" height="40" '
        'alt="" style="display:block;border:0;border-radius:10px"></td>'
        f'<td valign="middle" style="font-family:{_SERIF};font-size:16px;'
        'font-weight:700;color:#14273f">The PromoSlot Team</td>'
        '</tr></table></td></tr>'
    )


def _footer() -> str:
    privacy_url = f"{settings.app_base_url}/privacy"
    terms_url = f"{settings.app_base_url}/terms"
    # Computed per-render rather than cached, so a long-lived process never
    # ships a stale copyright year across a New Year's boundary. PromoSlot
    # Ltd was incorporated in 2026, so this reads as a single year until the
    # real year rolls past it, then becomes a range automatically.
    incorporated = 2026
    now_year = datetime.now(timezone.utc).year
    year = str(now_year) if now_year <= incorporated else f"{incorporated}–{now_year}"
    link = lambda href, label: (f'<a href="{href}" style="color:#c7d2fe;'
                                f'text-decoration:none">{label}</a>')
    link_row = (
        f'{link(privacy_url, "Privacy Policy")}'
        '<span style="color:#4a5b78">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>'
        f'{link(f"mailto:{settings.support_email}", "Contact Support")}'
        '<span style="color:#4a5b78">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>'
        f'{link(terms_url, "Terms of Service")}'
    )
    return (
        '<tr><td style="padding:18px 0 0"><table role="presentation" width="100%" '
        'cellpadding="0" cellspacing="0" border="0" bgcolor="#14273f" '
        'style="background:#14273f;border-radius:12px"><tr><td align="center" '
        f'style="padding:26px 30px;text-align:center"><p style="margin:0;'
        f'font-family:{_SANS};font-size:13px;line-height:1.6;font-weight:600;'
        f'color:#ffffff">{link_row}</p>'
        f'<p style="margin:14px 0 0;font-family:{_SANS};font-size:12px;'
        'line-height:1.6;color:#a9b6c8">PromoSlot Ltd &middot; Registered in '
        'Scotland &middot; No. SC899931<br>8B Drumsheugh Gardens, Edinburgh '
        f'EH3 7QJ</p><p style="margin:10px 0 0;'
        f'font-family:{_SANS};font-size:12px;line-height:1.6;color:#7c8ba3">'
        f'&copy; {year} PromoSlot Ltd</p></td></tr></table></td></tr>'
    )


def _shell(preheader: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>PromoSlot</title>
</head>
<body style="margin:0;padding:0;background:#f2f4f7;-webkit-text-size-adjust:100%">
<div style="display:none;font-size:1px;color:#f2f4f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">{_esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f4f7" style="background:#f2f4f7">
<tr><td align="center" style="padding:32px 16px 44px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:640px">
{_header()}
<tr><td bgcolor="#ffffff" style="background:#ffffff;border-left:1px solid #e4e8ee;border-right:1px solid #e4e8ee;padding:34px 36px 30px">
{body_html}
</td></tr>
{_signature()}
{_footer()}
</table>
</td></tr></table>
</body>
</html>"""


def password_reset_email(reset_url: str) -> tuple:
    """(subject, html, text) for a password-reset message."""
    subject = "Reset your PromoSlot password"
    body = (
        _h1("Reset your password")
        + _lead("We received a request to reset your PromoSlot password. "
                "Click the button below to choose a new one. This link expires "
                "in 1 hour and can only be used once.")
        + _button(reset_url, "Set a new password")
        + _fine("If you didn't request this, you can safely ignore this email. "
                "Your password won't change.")
        + _url_line(reset_url)
    )
    html = _shell("This link expires in 1 hour and can only be used once.", body)
    text = (f"Reset your PromoSlot password\n\n{reset_url}\n\n"
            "This link expires in 1 hour and can only be used once. "
            "If you didn't request it, ignore this email.")
    return subject, html, text


def welcome_email(display_name: str = "", is_business: bool = False,
                  is_platform_owner: bool = False, verify_url: str = "") -> tuple:
    """(subject, html, text) welcoming a brand-new account.

    Says nothing about what the account has done, it has just been created.
    The only personalisation is the name they gave and the role(s) they picked
    at signup, both of which are real answers they supplied.

    When verify_url is given this doubles as the verification email: the account
    cannot be used until that link is clicked, so the link leads and the
    orientation follows. Sending a separate welcome alongside it would land two
    near-identical mails at once and bury the one that matters.
    """
    name = (display_name or "").strip()
    hello = f"Welcome, {name}" if name else "Welcome to PromoSlot"
    hello_html = f"Welcome, {_esc(name)}" if name else "Welcome to PromoSlot"

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
                  "Add a profile picture and a short 'who we are': it's what the other "
                  "side sees before deciding to work with you."))

    hero_html = _hero("welcome-verify-hero.jpg" if verify_url else "welcome-plain-hero.jpg",
                      "Getting started on PromoSlot")

    verify_block_html = (
        _p("First, confirm this is your email address:")
        + _button(verify_url, "Verify my email")
        + _fine("The link works once and expires in 24 hours. You'll be signed in "
                "as soon as you use it.", margin="20px 0 0")
        + _url_line(verify_url)
        + _hr()
    ) if verify_url else _hr()

    open_button_html = "" if verify_url else _button(settings.app_base_url, "Open PromoSlot")

    body = (
        _h1(hello_html)
        + hero_html
        + _lead("Your account is ready. PromoSlot connects businesses with "
                "the people who own the audiences, and holds the money pending "
                "verification until the work is delivered and confirmed, so "
                "neither side has to trust the other up front.")
        + verify_block_html
        + _eyebrow("Then, where to start" if verify_url else "Where to start")
        + _steps(steps)
        + open_button_html
        + _fine("Fees are only charged when a deal completes: 10% from the seller, "
                "5% buyer protection from the buyer. Nothing is charged for creating "
                "an account or publishing.")
    )
    preheader = ("Confirm your email to activate your PromoSlot account."
                if verify_url else
                "Your PromoSlot account is ready. Here's where to start.")
    html = _shell(preheader, body)

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
            "Fees are only charged when a deal completes: 10% from the seller, 5% buyer "
            "protection from the buyer.")
    subject = ("Verify your email to finish setting up PromoSlot" if verify_url
               else "Welcome to PromoSlot")
    return subject, html, text


def proof_grace_period_email(deal_id: int, deadline_iso: str, note: str = "") -> tuple:
    """(subject, html, text) telling a platform owner they have 24 hours to
    add more delivery proof before a reviewer finalizes a per_view/
    per_impression deal using only what's already submitted.

    Sent alongside the in-app notification (see services.open_proof_grace_period)
    for exactly the reason every other time-sensitive account action in this
    file also gets one, a browser tab isn't a reliable place to expect
    someone to be watching a 24-hour clock. note is the reviewer's own
    explanation of what's missing or unclear; never invented copy standing
    in for it.
    """
    title = f"Action needed on Deal #{deal_id}: 24 hours to add delivery proof"
    note_block_html = (_eyebrow("What the reviewer said") + _quote(_esc(note))) if note else ""
    body = (
        _h1(title)
        + _lead(f"A PromoSlot reviewer looked at the delivery evidence on Deal "
                f"#{deal_id} and wants a chance to see more before finalizing the "
                f"payout amount. You have until <b style=\"color:#14273f\">"
                f"{deadline_iso}</b> (24 hours) to add anything further to your "
                f"submitted proof.")
        + note_block_html
        + _p("If nothing further is added before the deadline, the reviewer will "
             "finalize the deal using only what's already been formally submitted, "
             "never on anything not visible in your own submission.")
        + _button(f"{settings.app_base_url}/?deal={deal_id}",
                  f"Add proof to Deal #{deal_id}")
        + _fine(f"This is a routine check, not an accusation: it happens whenever a "
                f"reviewer wants more certainty on a number before money moves. "
                f"Questions? Reply to this email or contact "
                f"<a href=\"mailto:{settings.support_email}\" style=\"color:#4f46e5;"
                f"text-decoration:none\">{settings.support_email}</a>.")
    )
    html = _shell(f"You have until {deadline_iso} to add more delivery proof on "
                  f"Deal #{deal_id}.", body)
    text = (f"{title}\n\n"
            f"A PromoSlot reviewer looked at the delivery evidence on Deal #{deal_id} and "
            f"wants a chance to see more before finalizing the payout amount. You have "
            f"until {deadline_iso} (24 hours) to add anything further to your submitted proof.\n\n"
            + (f"What the reviewer said:\n{note}\n\n" if note else "")
            + "If nothing further is added before the deadline, the reviewer will finalize "
              "the deal using only what's already been formally submitted, never on "
              "anything not visible in your own submission.\n\n"
            f"Add proof: {settings.app_base_url}/?deal={deal_id}\n\n"
            "This is a routine check, not an accusation. Questions? Reply to this email "
            f"or contact {settings.support_email}.")
    return title, html, text


def support_ticket_email(ticket_id: int, name: str, email: str = "", mobile: str = "",
                         subject: str = "", body: str = "") -> tuple:
    """(subject, html, text) alerting the support inbox to a new ticket."""
    rows = [("From", _esc(name or "—"))]
    if email:
        rows.append(("Email", f'<a href="mailto:{_esc(email)}" style="color:#4f46e5;'
                               f'text-decoration:none">{_esc(email)}</a>'))
    else:
        rows.append(("Email", "—"))
    rows.append(("Mobile", _esc(mobile or "—")))
    rows.append(("Subject", _esc(subject or "—")))

    body_html = (
        _h1(f"New support ticket #{ticket_id}")
        + _field_rows(rows)
        + _eyebrow("Message")
        + _quote(_esc(body))
        + _fine("Reply from the Contacted Support queue in PromoSlot so the reply "
                "is recorded against the ticket.")
    )
    html = _shell(f"New ticket from {name}: {subject or 'New ticket'}", body_html)
    text = (f"New support ticket #{ticket_id}\n\n"
            f"From: {name}\nEmail: {email or '—'}\nMobile: {mobile or '—'}\n"
            f"Subject: {subject}\n\n{body}\n")
    return f"[Support #{ticket_id}] {subject or 'New ticket'}", html, text


def support_reply_email(ticket_id: int, subject: str, reply: str) -> tuple:
    """(subject, html, text) for a reviewer's reply to the person who wrote in."""
    body = (
        _h1(f"Re: {_esc(subject)}")
        + _p(_esc(reply).replace("\n", "<br>"))
        + _fine("Just reply to this email and it comes straight back to us on "
                "this ticket. Prefer to keep it in PromoSlot? Log in and reply "
                "from your Messages inbox instead. Either way reaches the same team.")
    )
    html = _shell("A reply on your PromoSlot support ticket.", body)
    text = (f"Re: {subject}\n\n{reply}\n\n"
            "Just reply to this email and it comes straight back to us on this "
            "ticket. Prefer to keep it in PromoSlot? Log in and reply from your "
            "Messages inbox instead. Either way reaches the same team.")
    return f"Re: {subject}" if subject else "A reply from PromoSlot support", html, text


def fetch_received_email(email_id: str) -> tuple:
    """Retrieve an inbound email's actual content. Returns (ok, data_or_detail).

    The email.received webhook carries metadata only, sender, recipients,
    subject, ids, so the body has to be fetched separately with this call.

    Received mail lives under /emails/receiving/{id}, NOT /emails/{id}, the
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
    admin actually typed, never embellished, and never omitted, because the
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
    reason_block_html = (
        (_eyebrow("Reason given") + _quote(_esc(reason)))
        if reason else _fine("No reason was recorded.", margin="0 0 20px")
    )

    body = (
        _h1(title)
        + _lead(lead)
        + reason_block_html
        + _p("Any funds already held for a deal in progress are unaffected by "
             "this and still follow the normal verification and payout process.",
             margin="6px 0 16px")
        + _hr()
        + _fine(f"If you think this is a mistake, reply to this email or contact "
                f"<a href=\"mailto:{settings.support_email}\" style=\"color:#4f46e5;"
                f"text-decoration:none\">{settings.support_email}</a> and a person "
                f"will look at it.", margin="18px 0 0")
    )
    html = _shell(lead, body)
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
    bad news precisely, and this is the opposite errand. No reason block, the
    restore is the whole message, and it ends on a way back in rather than on
    an appeals address.
    """
    name = (display_name or "").strip()
    hello = f"Welcome back, {name}" if name else "Welcome back"
    hello_html = f"Welcome back, {_esc(name)}" if name else "Welcome back"
    title = "Your account is active again, welcome back"
    url = settings.app_base_url

    body = (
        _h1(hello_html)
        + _hero("account-restored-hero.jpg", "Good to have you back")
        + _lead("The suspension on your PromoSlot account has been lifted. You "
                "can sign in again, and everything is where you left it: your "
                "profile, your listings and campaigns, and any deals in progress.")
        + _button(url, "Sign in to PromoSlot", margin="22px 0 6px")
        + _fine(f"It's good to have you back. If anything looks off when you sign "
                f"in, {settings.support_email} will sort it out.", margin="20px 0 0")
        + _url_line(url)
    )
    html = _shell("The suspension on your PromoSlot account has been lifted.", body)
    text = (f"{hello}\n\n"
            "The suspension on your PromoSlot account has been lifted. You can sign "
            "in again, and everything is where you left it: your profile, your "
            "listings and campaigns, and any deals in progress.\n\n"
            f"Sign in: {url}\n\n"
            "It's good to have you back. If anything looks off when you sign in, "
            f"{settings.support_email} will sort it out.")
    return title, html, text


def account_deactivated_email(reason: str = "") -> tuple:
    """(subject, html, text) confirming a self-service deactivation.

    Reversible, unlike account_deleted_email below, the whole point of the
    copy is "log back in whenever you're ready", not a permanent goodbye.
    Reactivation itself doesn't get its own email; logging back in with the
    account's own password is the confirmation.
    """
    title = "Your PromoSlot account has been deactivated"
    reason_block_html = (_eyebrow("Note") + _quote(_esc(reason))) if reason else ""

    body = (
        _h1(title)
        + _lead("Your profile is hidden from PromoSlot while you're deactivated, "
                "and any listings or campaigns are paused, not deleted or removed. "
                "Nothing about your account has been lost.")
        + reason_block_html
        + _p("Log back in any time with your usual email and password to pick "
             "up exactly where you left off.", margin="6px 0 16px")
        + _hr()
        + _fine(f"Didn't request this? Contact "
                f"<a href=\"mailto:{settings.support_email}\" style=\"color:#4f46e5;"
                f"text-decoration:none\">{settings.support_email}</a> straight away.",
                margin="18px 0 0")
    )
    html = _shell("Your account has been deactivated. Log back in any time to "
                  "reactivate it.", body)
    text = (f"{title}\n\n"
            "Your profile is hidden from PromoSlot while you're deactivated, and any "
            "listings or campaigns are paused, not deleted or removed. Nothing about "
            "your account has been lost.\n\n"
            + (f"Note:\n{reason}\n\n" if reason else "")
            + "Log back in any time with your usual email and password to pick up "
              "exactly where you left off.\n\n"
              f"Didn't request this? Contact {settings.support_email} straight away.")
    return title, html, text


def account_deleted_email(reason: str = "") -> tuple:
    """(subject, html, text) confirming an account's personal data was deleted.

    Sent to the address on file BEFORE it gets scrambled, this is the one
    chance to reach the person, so it goes out synchronously as part of the
    deletion, not best-effort afterwards. Deliberately its own function
    rather than a third _account_action_email "kind": that helper's
    ban/suspend copy ("can no longer be used", appeals language) doesn't fit
    a deletion, which is either the person's own request or an admin acting
    on one, not a moderation call.
    """
    title = "Your PromoSlot account has been deleted"
    reason_block_html = (_eyebrow("Note") + _quote(_esc(reason))) if reason else ""

    body = (
        _h1(title)
        + _lead("Your profile, bio, photo, intro video and any files you'd "
                "uploaded have been removed from PromoSlot, and your email "
                "address has been disconnected from the account.")
        + reason_block_html
        + _p("Records of any completed deals stay in our system, as our Privacy "
             "Policy explains, for accounting and dispute purposes, but they're "
             "no longer linked to your name or this email address.",
             margin="6px 0 16px")
        + _hr()
        + _fine(f"Didn't request this? Contact "
                f"<a href=\"mailto:{settings.support_email}\" style=\"color:#4f46e5;"
                f"text-decoration:none\">{settings.support_email}</a> straight away.",
                margin="18px 0 0")
    )
    html = _shell("Your profile and uploaded files have been removed from "
                  "PromoSlot.", body)
    text = (f"{title}\n\n"
            "Your profile, bio, photo, intro video and any files you'd uploaded have "
            "been removed from PromoSlot, and your email address has been "
            "disconnected from the account.\n\n"
            + (f"Note:\n{reason}\n\n" if reason else "")
            + "Records of any completed deals stay in our system, as our Privacy "
              "Policy explains, for accounting and dispute purposes, but they're no "
              "longer linked to your name or this email address.\n\n"
              f"Didn't request this? Contact {settings.support_email} straight away.")
    return title, html, text
