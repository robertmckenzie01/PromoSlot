"""Inbound support replies — Resend email receiving.

When a reviewer replies to a ticket the outgoing mail carries
Reply-To: ticket-{id}@<reply_domain>. Hitting reply in a mail client therefore
sends the answer to an address that identifies its own ticket, and Resend
receives it and calls this webhook.

Same posture as the Stripe receiver:
  1. signature-verified (Svix) — refused outright if it cannot be verified,
  2. de-duplicated by the inbound email id (Resend retries on failure),
  3. dispatched.

The webhook payload is metadata only, so the message body is fetched with a
second call (mailer.fetch_received_email) before anything is written.

Any address at the receiving subdomain reaches this endpoint, so mail that
isn't a ticket reply — a bounce, a stray probe, an autoresponder — is logged and
accepted quietly rather than erroring. Nothing is invented: an event is written
only when a real message body was actually retrieved.
"""
import logging
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import svix
from ..config import settings
from ..db import get_db
from ..mailer import extract_body, fetch_received_email, strip_quoted_reply
from ..models import Notification, SupportTicket, SupportTicketEvent, WebhookEvent

log = logging.getLogger(__name__)

router = APIRouter(tags=["inbound"])

# ticket-12@reply.usepromoslot.com  (+suffix tolerated: ticket-12+anything@...)
_TICKET_RE = re.compile(r"^ticket-(\d+)(?:\+[^@]*)?$", re.I)


def _recipients(payload: dict):
    """Every address this message was addressed to, however Resend shapes it."""
    data = payload.get("data") or payload
    out = []
    for key in ("to", "recipient", "recipients"):
        v = data.get(key)
        if isinstance(v, str):
            out.append(v)
        elif isinstance(v, list):
            out.extend([x for x in v if isinstance(x, str)])
    return out


def _ticket_id_from(addresses) -> int:
    """The ticket id encoded in a recipient address, or 0 if none of them match."""
    for addr in addresses:
        # tolerate "Name <ticket-3@reply...>"
        m = re.search(r"<([^>]+)>", addr or "")
        clean = (m.group(1) if m else addr or "").strip().lower()
        local, _, domain = clean.partition("@")
        if settings.reply_domain and domain != settings.reply_domain.lower():
            continue
        hit = _TICKET_RE.match(local)
        if hit:
            return int(hit.group(1))
    return 0


def _sender(payload: dict) -> str:
    data = payload.get("data") or payload
    v = data.get("from") or data.get("sender") or ""
    if isinstance(v, dict):
        v = v.get("email") or ""
    m = re.search(r"<([^>]+)>", str(v))
    return (m.group(1) if m else str(v)).strip()


@router.post("/webhooks/resend")
async def resend_inbound(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()

    if not settings.resend_webhook_secret:
        # Refuse to accept unverifiable events rather than trust them.
        raise HTTPException(status_code=503, detail="Inbound webhook secret not configured")
    try:
        svix.verify(settings.resend_webhook_secret, request.headers, raw)
    except svix.SignatureError as e:
        raise HTTPException(status_code=400, detail=f"Invalid signature: {e}")

    import json
    try:
        payload = json.loads(raw.decode() or "{}")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    etype = payload.get("type") or ""
    if etype != "email.received":
        return {"received": True, "ignored": f"unhandled type {etype or 'unknown'}"}

    data = payload.get("data") or {}
    email_id = data.get("email_id") or data.get("id") or ""
    if not email_id:
        return {"received": True, "ignored": "no email id"}

    # Idempotency — Resend redelivers on failure. Reuses the existing
    # webhook_events table with a namespaced id so the two sources can't collide.
    key = f"resend:{email_id}"
    rec = db.get(WebhookEvent, key)
    if rec is not None and rec.processed:
        return {"received": True, "duplicate": True}
    if rec is None:
        rec = WebhookEvent(id=key, type=etype, processed=False)
        db.add(rec)
        db.commit()

    ticket_id = _ticket_id_from(_recipients(payload))
    if not ticket_id:
        log.info("inbound mail %s not addressed to a ticket — ignored", email_id)
        rec.processed = True
        db.commit()
        return {"received": True, "ignored": "not a ticket address"}

    t = db.get(SupportTicket, ticket_id)
    if t is None:
        log.info("inbound mail %s references unknown ticket %s — ignored", email_id, ticket_id)
        rec.processed = True
        db.commit()
        return {"received": True, "ignored": f"unknown ticket {ticket_id}"}

    # Metadata only in the webhook — go and get what they actually wrote.
    ok, body_data = fetch_received_email(email_id)
    if not ok:
        # Leave it unprocessed and ask for redelivery; a 5xx is the retry signal.
        log.warning("could not retrieve inbound email %s: %s", email_id, body_data)
        raise HTTPException(status_code=503, detail="Could not retrieve message; awaiting redelivery")

    text = strip_quoted_reply(extract_body(body_data))
    if not text:
        log.info("inbound mail %s had no readable body — ignored", email_id)
        rec.processed = True
        db.commit()
        return {"received": True, "ignored": "empty body"}

    sender = _sender(payload) or (t.email or "")
    db.add(SupportTicketEvent(
        ticket_id=t.id,
        author_id=None,          # written by the submitter, not a reviewer
        kind="submitter_reply",
        body=text,
    ))

    # A reply means the ticket needs attention again. The queue counts unhandled
    # tickets as "open" and badges handled ones as "Replied", so clearing the
    # flag is what puts it back in front of the team.
    was_handled = t.handled
    t.handled = False

    # Tell whoever owns it. Unclaimed tickets are already visible in the queue,
    # so there is nobody specific to notify.
    if t.assigned_to_id:
        db.add(Notification(
            user_id=t.assigned_to_id, type="support_ticket",
            body=f"{sender or t.name} replied to ticket #{t.id}: \"{t.subject}\".",
            ref=f"support_ticket:{t.id}"))

    rec.processed = True
    db.commit()
    log.info("inbound reply recorded on ticket %s from %s", t.id, sender)
    return {"received": True, "ticket_id": t.id, "reopened": was_handled,
            "notified_owner": bool(t.assigned_to_id)}
