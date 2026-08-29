"""Domain services shared across routers and webhook handlers."""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from . import audit, storage
from .deal_state import can_transition
from .models import (
    AccountVerificationRequest, AffiliateCode, AffiliateConversion, AffiliateProgram,
    AffiliateTopUp, Business, ConnectedAccount, Deal, DealStatus, Dispute, DisputeEvent,
    Notification, Payment, Platform, Proof, Transfer, User, Verification,
)
from .permissions import Perm, ROLE_PERMISSIONS
from .stripe_client import stripe


def deal_money(listed_price: int, seller_pct: int, buyer_pct: int) -> dict:
    """Split-fee breakdown, all fees on the agreed/listed price (pence).

    Example ($100 listed, 10% seller / 5% buyer):
      buyer_fee=500, seller_fee=1000, charge_amount=10500 (business pays $105),
      net_to_owner=9000 (owner gets $90), platform_take=1500 ($15).
    """
    buyer_fee = listed_price * buyer_pct // 100
    seller_fee = listed_price * seller_pct // 100
    return {
        "listed_price": listed_price,
        "buyer_fee": buyer_fee,             # buyer protection fee, added at funding
        "seller_fee": seller_fee,           # seller fee, deducted at payout
        "charge_amount": listed_price + buyer_fee,   # what the business is charged
        "net_to_owner": listed_price - seller_fee,   # what the owner receives
        "platform_take": buyer_fee + seller_fee,
    }


def deal_money_for(deal) -> dict:
    """Breakdown for a specific deal, using the fee rates locked on it."""
    return deal_money(deal.listed_price, deal.seller_fee_percent, deal.buyer_fee_percent)


def total_charge_for(deal) -> dict:
    """What the business is actually charged at funding, fixed + pool combined
    into one number for one PaymentIntent (see routers/deals.py's fund_deal).

    A plain fixed deal (pool_max_budget is None) is unaffected — this is
    just deal_money_for(deal)'s charge_amount with 0 added. For a pool/
    hybrid deal it's that same fixed-side charge plus what deal_money()
    says the pool's own max budget would cost to fully fund (pool_max_budget
    + its own buyer fee) — the same "pool listed_price equivalent" framing
    pool_settlement_for() uses at the other end, at settlement.
    """
    fixed = deal_money_for(deal)
    pool_charge = 0
    if deal.pool_max_budget:
        pool_charge = deal_money(deal.pool_max_budget, deal.seller_fee_percent,
                                 deal.buyer_fee_percent)["charge_amount"]
    return {"fixed_charge": fixed["charge_amount"], "pool_charge": pool_charge,
            "total_charge": fixed["charge_amount"] + pool_charge}


def _g(obj, *path):
    """Safely walk an attribute/dict path on a Stripe v2 object or dict."""
    cur = obj
    for key in path:
        if cur is None:
            return None
        cur = cur.get(key) if isinstance(cur, dict) else getattr(cur, key, None)
    return cur


def transfers_status_of(acct) -> Optional[str]:
    """Status of the recipient's stripe_transfers capability on a v2 account."""
    return _g(acct, "configuration", "recipient", "capabilities",
              "stripe_balance", "stripe_transfers", "status")


def requirements_outstanding(acct) -> bool:
    """True if the account still needs onboarding before it can receive transfers."""
    # If the payout capability isn't active, onboarding is by definition incomplete.
    if transfers_status_of(acct) != "active":
        return True
    # Capability active but Stripe may still list currently-due items.
    entries = _g(acct, "requirements", "entries") or []
    for e in entries:
        if _g(e, "minimum_deadline", "status") == "currently_due":
            return True
    return bool(_g(acct, "requirements", "summary", "minimum_currently_due"))


def sync_connected_account(db: Session, acct) -> Optional[ConnectedAccount]:
    """Mirror a Stripe v2 account's payout capability onto our row.

    Only updates accounts we actually own a row for.
    """
    acct_id = _g(acct, "id")
    if not acct_id:
        return None
    row = db.query(ConnectedAccount).filter_by(stripe_account_id=acct_id).first()
    if row is None:
        return None
    status = transfers_status_of(acct)
    row.transfers_status = status
    row.transfers_active = (status == "active")
    row.requirements_due = requirements_outstanding(acct)
    db.commit()
    db.refresh(row)
    return row


def onboarding_complete(row: ConnectedAccount) -> bool:
    """A platform owner can only be paid once transfers are active."""
    return bool(row and row.transfers_active)


# ---------------------------------------------------------------------------
# Business Stripe verification (Accounts v2, "merchant" configuration)
#
# A business is never actually paid through this account and never accepts a
# charge on it — PromoSlot stays merchant of record for every deal, exactly
# as today. The `card_payments` capability is requested purely because
# Stripe v2 refuses to collect identity/KYB fields on an account with no
# real capability requested at all (confirmed against Stripe's own API
# error: unsupported_identity_field_for_configs) — this is the same trick
# already used for platform owners requesting `stripe_transfers` they may
# never end up using either. No charge-acceptance code path is ever built
# on top of this capability.
# ---------------------------------------------------------------------------

def business_capability_status_of(acct) -> Optional[str]:
    """Status of the business's card_payments capability on a v2 account —
    requested purely to unlock KYB collection, see module note above."""
    return _g(acct, "configuration", "merchant", "capabilities",
              "card_payments", "status")


def stripe_legal_name_of(acct) -> Optional[str]:
    """The legal business name Stripe verified, straight from the account's
    own identity block — never user-entered, never trusted from the client.
    This is what a human reviewer cross-checks against the business's actual
    PromoSlot profile before confirming a match (see decide_verification)."""
    return (_g(acct, "identity", "business_details", "registered_name")
            or _g(acct, "identity", "business_details", "name"))


def business_requirements_outstanding(acct) -> bool:
    if business_capability_status_of(acct) != "active":
        return True
    entries = _g(acct, "requirements", "entries") or []
    for e in entries:
        if _g(e, "minimum_deadline", "status") == "currently_due":
            return True
    return bool(_g(acct, "requirements", "summary", "minimum_currently_due"))


def sync_business_account(db: Session, business: Business, acct) -> dict:
    """Mirror a business's Stripe v2 identity check onto our row, and return
    what changed — same 'never set optimistically, always from a live Stripe
    read' rule as sync_connected_account above."""
    status = business_capability_status_of(acct)
    legal_name = stripe_legal_name_of(acct)
    return {
        "verified_by_stripe": status == "active",
        "requirements_due": business_requirements_outstanding(acct),
        "stripe_legal_name": legal_name,
    }


# ---------------------------------------------------------------------------
# Account verification decisions (business identity, platform identity,
# platform ownership evidence) — see models.AccountVerificationRequest for
# the shape. Every decision here is a deliberate human action; nothing in
# this module ever sets Business.verified / Platform.verified from a Stripe
# status alone. See routers/verification.py for the endpoints that call this.
# ---------------------------------------------------------------------------

# A platform owner needs both of these approved before the badge shows; a
# business needs only business_identity. Kept as one tuple so the "is this
# subject fully verified yet" check in one place, not duplicated per caller.
#
# Both gates are account-level (keyed on submitted_by, the owner's user id),
# NOT tied to any one Platform listing (platform_id is left null on these
# requests). A platform owner can pass identity + ownership before ever
# creating a listing — see routers/verification.py's platform endpoints,
# which no longer take a platform_id at all. Rob, 2026-08-27: "why can't
# [ownership evidence] point to their own promoslot account" instead of a
# specific listing — it can; the listing requirement was an accidental
# coupling in the original schema, not a real constraint. Known tradeoff
# accepted deliberately: an owner who lists multiple distinct channels gets
# ONE account-wide badge, not a per-channel one — fine while every real
# platform owner only runs a single channel; revisit if that stops being true.
_PLATFORM_GATES = ("platform_identity", "platform_ownership")


def platform_owner_verified(db: Session, owner_id: int) -> bool:
    """Has this user (a platform owner) passed both verification gates?
    Account-level — independent of how many (if any) listings they have."""
    approved_types = {
        r.subject_type for r in db.query(AccountVerificationRequest).filter(
            AccountVerificationRequest.submitted_by == owner_id,
            AccountVerificationRequest.status == "approved",
            AccountVerificationRequest.subject_type.in_(_PLATFORM_GATES),
        )
    }
    return set(_PLATFORM_GATES).issubset(approved_types)


def _wipe_evidence(req: AccountVerificationRequest) -> None:
    """Delete any uploaded evidence media the moment a decision is made —
    approved or rejected. Applies the same 'never retained' principle Rob
    set for ID documents to platform-ownership evidence too, since a login
    screen-recording can expose things just as private."""
    for ref in (req.evidence_media or []):
        try:
            storage.delete_stored(ref)
        except Exception:
            pass  # best-effort — a storage hiccup must never block a decision
    req.evidence_media = []


def decide_verification(db: Session, req: AccountVerificationRequest, *, approve: bool,
                        reviewer: User, reason: str = None, request=None) -> AccountVerificationRequest:
    """The human-confirm gate — the only place status ever moves off 'pending'.

    Approving one gate does not by itself grant a badge: for platform_identity
    /platform_ownership, both requests from that OWNER (not that listing —
    see platform_owner_verified above) must be approved first; for
    business_identity, this row alone is the whole gate.
    """
    if req.status != "pending":
        raise ValueError("Already decided")

    _wipe_evidence(req)
    req.reviewed_by = reviewer.id
    req.reviewed_at = datetime.utcnow()
    req.status = "approved" if approve else "rejected"
    if not approve:
        req.rejected_reason = (reason or "").strip() or None
    # platform_owner_verified() below re-queries this same table for approved
    # rows — flush first so it reliably sees THIS request's new status rather
    # than depending on autoflush config or identity-map object reuse.
    db.flush()

    fully_verified = False
    if approve:
        if req.subject_type == "business_identity" and req.business_id:
            subject = db.query(Business).get(req.business_id)
            if subject:
                subject.verified = True
            fully_verified = True   # single-gate — this decision alone completes it
        elif req.subject_type in _PLATFORM_GATES:
            if platform_owner_verified(db, req.submitted_by):
                # Account-level badge: sync onto every listing this owner has
                # now, and routers/platforms.py's create_platform sets it on
                # any listing they add later — neither depends on the other.
                db.query(Platform).filter(Platform.owner_id == req.submitted_by).update(
                    {"verified": True}, synchronize_session=False)
                fully_verified = True

    # Rob, 2026-08-29 (verbatim): "users are not notified when they are
    # approved and verified... I hope for a 'Great news! Your Platform
    # ownership application has been approved, you're one step closer to
    # getting verified'... there should be a red icon on the notification
    # bell." One decision always ends the badge (business_identity), the
    # other needs both gates (platform_*) — the copy reflects which case
    # this is so a partial approval doesn't falsely claim the badge is live.
    # ref "verification:biz"/"verification:plat" routes the frontend's
    # openNotif() straight into openVerify(role) — see promoslot-app.js.
    role = "biz" if req.subject_type == "business_identity" else "plat"
    label = {"business_identity": "Business verification", "platform_identity": "Identity",
              "platform_ownership": "Platform ownership"}[req.subject_type]
    if approve:
        body = (f"Great news! You're now Verified ✔ on PromoSlot — your badge is live."
                if fully_verified else
                f"Great news! Your '{label}' application has been approved — you're one step closer to getting verified.")
        notif_type = "verification_approved"
    else:
        body = f"Your '{label}' application needs another look" + (f": {req.rejected_reason}." if req.rejected_reason else ".") + " Resubmit whenever you're ready."
        notif_type = "verification_rejected"
    db.add(Notification(user_id=req.submitted_by, type=notif_type, body=body, ref=f"verification:{role}"))

    audit.record(db, actor=reviewer, action="verification.decide",
                target_type=req.subject_type,
                target_id=req.business_id or req.platform_id or req.submitted_by,
                previous_state={"status": "pending"},
                new_state={"status": req.status, "reason": req.rejected_reason},
                reason=reason, request=request)
    db.commit()
    db.refresh(req)
    return req


# Delivery Checklist — composable, not a full platform x payment-model
# matrix. A small always-required base applies to every deal; ONE extra
# item is added only for pool-priced deals (per_view/per_impression),
# since that's the only case with an actual number needing backing
# evidence. The platform a listing is on only changes the wording of
# that one item (which native analytics tool to screenshot), not the
# item count — this keeps authoring/maintenance to ~20 short strings
# instead of 18 platforms x 3 pricing models of bespoke copy.
#
# This checklist is PromoSlot-defined and NOT configurable by the
# business or platform owner. PromoSlot always independently verifies
# delivery regardless of what's ticked here — it exists to make sure
# the platform owner submits the right proof the first time, not to be
# trusted on its own.
DELIVERY_CHECKLIST_BASE = [
    {"id": "live_url", "label": "Direct link/URL to where the content or placement is live"},
    {"id": "live_screenshot", "label": "Screenshot showing the content is live, with a visible date or timestamp"},
    {"id": "brand_visible", "label": "Screenshot showing the business's brand, product, or campaign clearly featured in the content"},
]

# Wording only, keyed on the exact platform_type strings the frontend's
# PLATFORM_META sends (see frontend/promoslot-app.js ALL_PLATFORMS).
_PLATFORM_ANALYTICS_TOOL = {
    "TikTok": "TikTok Analytics",
    "Instagram": "Instagram Insights",
    "Discord": "Discord server insights (or a member-count/message-view screenshot if insights aren't available)",
    "Newsletter": "your email platform's open/click report (e.g. Mailchimp, ConvertKit, Substack)",
    "YouTube": "YouTube Studio Analytics",
    "Livestream": "the stream platform's viewer/analytics dashboard (e.g. Twitch Analytics, YouTube Live analytics)",
    "Reddit": "Reddit's post or community analytics",
    "Quora": "Quora's answer/space analytics if available, or the view count shown on the post",
    "X": "X Analytics",
    "LinkedIn": "LinkedIn Analytics",
    "Pinterest": "Pinterest Analytics",
    "Blog/Website": "your site's traffic analytics for the page (e.g. Google Analytics, Plausible)",
    "Podcast": "your podcast host's listen/download analytics (e.g. Spotify for Podcasters, Apple Podcasts Connect)",
    "Facebook": "Facebook Page Insights",
    "Telegram": "Telegram's channel statistics",
    "Threads": "Threads insights",
    "Forum/Community": "the platform's own view/reply count on the post or thread",
    "Other": "whatever native analytics tool the platform provides",
}


def delivery_checklist_for(deal: Deal) -> list:
    """Compose the Delivery Checklist for a specific deal. See module
    comment above DELIVERY_CHECKLIST_BASE for the design rationale.
    """
    items = list(DELIVERY_CHECKLIST_BASE)
    if deal.pricing_model in ("per_view", "per_impression"):
        platform_type = getattr(deal.platform, "platform_type", None)
        tool = _PLATFORM_ANALYTICS_TOOL.get(platform_type, "the platform's own analytics/insights tool")
        metric = "view" if deal.pricing_model == "per_view" else "impression"
        items.append({
            "id": "analytics_screenshot",
            "label": f"Screenshot of {tool} showing the {metric} count, dated within the campaign window",
        })
    return items


def mark_deal_funded_from_pi(db: Session, pi_id: str) -> Optional[Deal]:
    """Mark a deal funded — ONLY if Stripe confirms the PaymentIntent succeeded.

    Called from the payment_intent.succeeded webhook. We never trust the event
    payload alone: we re-retrieve the PaymentIntent from Stripe and require
    status == 'succeeded'. Idempotent: a deal already funded is left untouched.
    """
    deal = db.query(Deal).filter_by(payment_intent_id=pi_id).first()
    if deal is None or deal.funded_at is not None:
        return deal

    try:
        pi = stripe.PaymentIntent.retrieve(pi_id)
    except Exception:
        return deal
    if getattr(pi, "status", None) != "succeeded":
        return deal  # gate: real success only

    deal.funded_at = datetime.utcnow()
    deal.status = DealStatus.FUNDED
    deal.charge_id = getattr(pi, "latest_charge", None)

    # The campaign clock starts now, not at deal creation — a deal can sit
    # unfunded for days waiting on approval/payment, and it wouldn't be fair
    # for the campaign window to have been silently ticking down the whole
    # time. Only ever computed from campaign_duration_days (collected at
    # creation, see routers/deals.py) once funding is a real confirmed event.
    if deal.pricing_model in ("per_view", "per_impression") and deal.campaign_duration_days:
        deal.campaign_starts_at = deal.funded_at
        deal.campaign_ends_at = deal.funded_at + timedelta(days=deal.campaign_duration_days)

    pay = db.query(Payment).filter_by(stripe_payment_intent_id=pi_id).first()
    if pay is not None:
        pay.status = "succeeded"

    # Real event -> real notification for the platform owner.
    db.add(Notification(
        user_id=deal.platform_owner_id,
        type="deal_funded",
        body=f"Deal #{deal.id} is funded and held pending verification.",
        ref=str(deal.id),
    ))
    # Dedicated follow-up notification pointing the platform owner at the
    # Delivery Checklist — sent right after the funded notification (same
    # ref/deep-link pattern) so it's clear what to do next, rather than
    # leaving them to work it out from the deal page alone.
    db.add(Notification(
        user_id=deal.platform_owner_id,
        type="delivery_checklist_ready",
        body=f"Deal #{deal.id}: see the Delivery Checklist for exactly what proof to submit.",
        ref=str(deal.id),
    ))
    db.commit()
    db.refresh(deal)
    return deal


def mark_affiliate_program_funded_from_pi(db: Session, pi_id: str) -> Optional[AffiliateProgram]:
    """Mark an affiliate program's pool funded — ONLY if Stripe confirms the
    PaymentIntent succeeded. Same shape as mark_deal_funded_from_pi above,
    called from the same payment_intent.succeeded webhook (a PaymentIntent
    id is only ever tied to ONE of a Deal or an AffiliateProgram, never
    both, so the dispatcher tries this as the fallback when no Deal
    matches). Deliberately does NOT set campaign_starts_at/ends_at here —
    the campaign clock only starts once tracking is confirmed and the
    program goes live (see routers/affiliate.py's confirm_tracking), not
    at funding, so a business doesn't lose campaign days to their own
    checkout-setup time.
    """
    program = db.query(AffiliateProgram).filter_by(payment_intent_id=pi_id).first()
    if program is None or program.status != "awaiting_funding":
        return program

    try:
        pi = stripe.PaymentIntent.retrieve(pi_id)
    except Exception:
        return program
    if getattr(pi, "status", None) != "succeeded":
        return program  # gate: real success only

    program.status = "funded"
    program.charge_id = getattr(pi, "latest_charge", None)

    db.add(Notification(
        user_id=program.business_id, type="affiliate_funded",
        body=f"{program.name}'s pool is funded — connect your checkout tracking to go live.",
        ref=f"affiliate_manage:{program.id}",
    ))
    db.commit()
    db.refresh(program)
    return program


def mark_affiliate_topup_funded_from_pi(db: Session, pi_id: str) -> Optional[AffiliateTopUp]:
    """Mark a pool top-up funded — ONLY if Stripe confirms the PaymentIntent
    succeeded. Same shape and same real-success gate as
    mark_affiliate_program_funded_from_pi/mark_deal_funded_from_pi, tried as
    the LAST fallback in the payment_intent.succeeded dispatcher (a
    PaymentIntent id only ever matches one of a Deal, an AffiliateProgram's
    original funding, or an AffiliateTopUp — never more than one).
    program.pool_max_budget only increases here, once, on real confirmed
    success — never optimistically when the top-up is first requested.
    """
    topup = db.query(AffiliateTopUp).filter_by(payment_intent_id=pi_id).first()
    if topup is None or topup.status == "funded":
        return topup

    try:
        pi = stripe.PaymentIntent.retrieve(pi_id)
    except Exception:
        return topup
    if getattr(pi, "status", None) != "succeeded":
        return topup  # gate: real success only

    topup.status = "funded"
    topup.funded_at = datetime.utcnow()
    topup.charge_id = getattr(pi, "latest_charge", None)

    program = db.get(AffiliateProgram, topup.program_id)
    if program is not None:
        program.pool_max_budget = (program.pool_max_budget or 0) + topup.amount
        db.add(Notification(
            user_id=program.business_id, type="affiliate_topup_funded",
            body=f"Your top-up of {program.currency.upper()} {topup.amount/100:.2f} for "
                 f"{program.name} is confirmed — the pool budget has increased.",
            ref=f"affiliate_manage:{program.id}",
        ))
    db.commit()
    db.refresh(topup)
    return topup


def record_affiliate_conversion(db: Session, program: AffiliateProgram, code: AffiliateCode,
                                sale_amount: int, source: str,
                                external_order_ref: Optional[str] = None,
                                occurred_at: Optional[datetime] = None) -> Optional[AffiliateConversion]:
    """Create one tracked sale. This is the ONLY place an AffiliateConversion
    is ever created — called only from a signature-verified store webhook or
    the fallback tracking snippet (see routers/affiliate_tracking.py), never
    with data the platform owner supplied themselves. That's what actually
    makes "the platform owner can't lie about sales made" true structurally.

    Idempotent on external_order_ref: a redelivered webhook for an order
    already recorded returns the existing row instead of double-counting it.
    Gated on program.status in ("live", "ended") rather than just "live" so
    a sale reported during the post-campaign holding-period grace window
    (before settlement runs — see models.AffiliateProgram's docstring) still
    gets recorded, not silently dropped, once #208 starts moving programs to
    "ended" at campaign_ends_at.
    """
    if program.status not in ("live", "ended"):
        return None
    if code.program_id != program.id or not code.active:
        return None
    if external_order_ref:
        dup = db.query(AffiliateConversion).filter_by(
            program_id=program.id, external_order_ref=external_order_ref).first()
        if dup is not None:
            return dup

    if program.commission_type == "flat":
        commission_amount = program.commission_rate
    else:  # "pct" — commission_rate is percent*100 (e.g. 1250 = 12.50%)
        commission_amount = (max(0, sale_amount) * program.commission_rate) // 10000
    commission_amount = max(0, commission_amount)

    conv = AffiliateConversion(
        program_id=program.id, code_id=code.id, external_order_ref=external_order_ref,
        sale_amount=max(0, sale_amount), commission_amount=commission_amount,
        source=source, occurred_at=occurred_at or datetime.utcnow(),
    )
    db.add(conv)
    # Running display total only — capped so the browse page never shows
    # negative remaining budget. The authoritative accounting for what's
    # actually owed happens at settlement (#208), directly from conversion
    # rows, not from this running number.
    program.pool_committed_amount = min(program.pool_max_budget,
                                        program.pool_committed_amount + commission_amount)

    db.add(Notification(
        user_id=program.business_id, type="affiliate_conversion",
        body=f"New tracked sale on {program.name} — code {code.code}.",
        ref=f"affiliate_manage:{program.id}",
    ))
    db.add(Notification(
        user_id=code.platform_owner_id, type="affiliate_conversion",
        body=f"You just earned a commission on {program.name} — nice work!",
        ref="affiliate_codes",
    ))
    db.commit()
    db.refresh(conv)
    return conv


def reverse_affiliate_conversion(db: Session, program: AffiliateProgram,
                                 external_order_ref: str, reason: str) -> Optional[AffiliateConversion]:
    """A refund/cancellation reported by the store. Excludes the sale from
    settlement entirely (same treatment as a reversed order on any Deal) and
    gives the pool budget back. Idempotent — reversing an order twice, or an
    order that was never recorded, is a safe no-op."""
    conv = db.query(AffiliateConversion).filter_by(
        program_id=program.id, external_order_ref=external_order_ref, status="pending").first()
    if conv is None:
        return None
    conv.status = "reversed"
    conv.reversed_reason = reason
    conv.reversed_at = datetime.utcnow()
    program.pool_committed_amount = max(0, program.pool_committed_amount - conv.commission_amount)
    db.commit()
    db.refresh(conv)
    return conv


def affiliate_settlement_for(program: AffiliateProgram, owner_commission_totals: dict) -> dict:
    """Pure math for one-time campaign-end settlement of an affiliate pool —
    no Stripe, no DB. Same shape as pool_settlement_for (deal_money() used
    once for the full pool, once for the released slice, so refund =
    charged_for_pool - kept_for_released can never drift from what
    deal_money() would compute for either on its own), extended to split the
    released slice across however many platform owners earned commission on
    this program, since — unlike a Deal, which always has exactly one
    platform owner — a program can have many.

    owner_commission_totals: {platform_owner_id: sum of PENDING (non-
    reversed) AffiliateConversion.commission_amount for that owner on this
    program}. Reversed conversions must already be excluded by the caller's
    query — this function has no way to tell the difference itself.

    If total commission earned exceeds pool_max_budget, every owner's share
    is scaled down proportionally to the capped total, rather than paying
    out in some arbitrary order until the pool runs dry — that would make
    payout depend on iteration order, not on what was actually earned.

    Per-owner net is floor-rounded independently per owner (each gets their
    own real, whole-pence Stripe Transfer). The sum of those may land a few
    pence under the aggregate kept_for_released["net_to_owner"] purely from
    splitting one floor-rounded number across several floor-rounded parts —
    the same kind of harmless rounding slack pool_settlement_for's own
    docstring already accepts ("real view counts are never round"). This
    function never lets that slack push a payout OVER the aggregate net
    budget, only under it by at most a few pence, which is not owed to
    anyone and is simply retained rather than distributed.
    """
    total_commission = sum(owner_commission_totals.values())
    total_commission_capped = min(total_commission, program.pool_max_budget)

    charged_for_pool = deal_money(program.pool_max_budget, program.payout_fee_percent, program.funding_fee_percent)
    kept_for_released = deal_money(total_commission_capped, program.payout_fee_percent, program.funding_fee_percent)
    refund_to_business = max(0, charged_for_pool["charge_amount"] - kept_for_released["charge_amount"])

    payouts = {}
    net_budget_remaining = kept_for_released["net_to_owner"]
    if total_commission > 0:
        for owner_id, commission in owner_commission_totals.items():
            share = commission * total_commission_capped // total_commission
            net = deal_money(share, program.payout_fee_percent, 0)["net_to_owner"]
            net = max(0, min(net, net_budget_remaining))  # never exceed what's actually kept back
            net_budget_remaining -= net
            payouts[owner_id] = {"commission": commission, "capped_share": share, "net_to_owner": net}

    return {
        "total_commission": total_commission,
        "total_commission_capped": total_commission_capped,
        "refund_to_business": refund_to_business,
        "platform_take": kept_for_released["platform_take"],
        "payouts": payouts,   # {platform_owner_id: {commission, capped_share, net_to_owner}}
    }


def settle_affiliate_program(db: Session, program: AffiliateProgram,
                             owner_destinations: dict) -> dict:
    """Execute the one-time campaign-end settlement for real: one Stripe
    Transfer per platform owner who earned a nonzero payout, then one Stripe
    Refund of whatever's left of the pool back to the business.

    owner_destinations: {platform_owner_id: stripe_connected_account_id} for
    every owner with a nonzero payout — caller (the admin endpoint) is
    responsible for having already confirmed each of these accounts is
    actually payout-ready; this function trusts the mapping it's given and
    will let a bad/missing destination fail loudly via the real Stripe call
    rather than silently skip a payout.

    Transfers happen first, one at a time, each recorded on that owner's
    AffiliateCode immediately after it succeeds — so a failure partway
    through (owner 3 of 5 fails) leaves owners 1-2 correctly paid and
    recorded, never rolled back, exactly like settle_pool_deal's "transfer
    already happened for real" reasoning. The refund is attempted last, only
    after every payout attempt has been made; if this program has an
    unresolved partial failure the caller should not treat the program as
    settled (see the endpoint, which checks the returned per-owner errors).
    """
    conversions = (db.query(AffiliateConversion)
                  .join(AffiliateCode, AffiliateConversion.code_id == AffiliateCode.id)
                  .filter(AffiliateConversion.program_id == program.id,
                          AffiliateConversion.status == "pending").all())
    owner_commission_totals: dict = {}
    owner_codes: dict = {}
    owner_conversion_rows: dict = {}
    for c in conversions:
        code = db.get(AffiliateCode, c.code_id)
        if code is None:
            continue
        owner_commission_totals[code.platform_owner_id] = (
            owner_commission_totals.get(code.platform_owner_id, 0) + c.commission_amount)
        owner_codes[code.platform_owner_id] = code
        owner_conversion_rows.setdefault(code.platform_owner_id, []).append(c)

    math_result = affiliate_settlement_for(program, owner_commission_totals)

    transfers = []
    errors = []
    for owner_id, payout in math_result["payouts"].items():
        net = payout["net_to_owner"]
        code = owner_codes.get(owner_id)
        if code is None:
            continue
        if net <= 0:
            # Genuinely earned nothing payable (e.g. proportional capping
            # rounded them to zero) — their conversions are still finished
            # settling, just for £0, so they're marked settled too rather
            # than left "pending" forever with nothing left to ever act on.
            for c in owner_conversion_rows.get(owner_id, []):
                c.status = "settled"
            db.commit()
            continue
        destination = owner_destinations.get(owner_id)
        if not destination:
            errors.append({"platform_owner_id": owner_id, "error": "No payout-ready destination account"})
            continue  # conversions stay "pending" — genuinely unresolved, not silently closed out
        try:
            tr = stripe.Transfer.create(
                amount=net,
                currency=program.currency,
                destination=destination,
                source_transaction=program.charge_id,
                transfer_group=f"affiliate_program_{program.id}",
                metadata={"affiliate_program_id": str(program.id), "platform_owner_id": str(owner_id),
                         "promoslot": "affiliate_settlement_payout"},
            )
        except Exception as e:
            errors.append({"platform_owner_id": owner_id, "error": str(e)})
            continue  # conversions stay "pending" — the money never actually moved
        code.payout_transfer_id = tr.id
        code.payout_net_amount = net
        code.payout_at = datetime.utcnow()
        for c in owner_conversion_rows.get(owner_id, []):
            c.status = "settled"
        db.add(Notification(
            user_id=owner_id, type="affiliate_settled",
            body=f"{program.name} has settled — {program.currency.upper()} {net/100:.2f} sent to you.",
            ref="affiliate_codes",
        ))
        db.commit()
        transfers.append({"platform_owner_id": owner_id, "transfer_id": tr.id, "net_to_owner": net})

    refund_amount = math_result["refund_to_business"]
    rf = None
    if refund_amount > 0 and program.payment_intent_id:
        try:
            rf = stripe.Refund.create(
                payment_intent=program.payment_intent_id,
                amount=refund_amount,
                reason="requested_by_customer",
                metadata={"affiliate_program_id": str(program.id), "promoslot": "affiliate_pool_unused_refund"},
            )
            program.refund_id = rf.id
        except Exception as e:
            errors.append({"refund_error": str(e)})

    program.pool_released_amount = math_result["total_commission_capped"]
    program.pool_refunded_amount = refund_amount if rf is not None else 0
    program.pool_settled_at = datetime.utcnow()
    # Always finalizes to "settled", even if `errors` is non-empty — the
    # endpoint has already pre-validated every destination before calling
    # this, so an error here is a rare transient Stripe failure, not a
    # foreseeable one. Any owner an error left un-paid keeps their
    # conversions "pending" (see above) as an honest, visible signal that
    # money still hasn't moved for them — a real gap that needs a human
    # follow-up (support/manual Stripe action), not a fully automated retry
    # path, which is out of scope here. The caller surfaces `errors` in the
    # response specifically so this isn't silently swallowed.
    program.status = "settled"
    db.add(Notification(
        user_id=program.business_id, type="affiliate_settled",
        body=(f"{program.name} has settled."
              + (f" {program.currency.upper()} {refund_amount/100:.2f} of unused pool budget was refunded to you."
                 if refund_amount > 0 else " Full pool budget was earned, no refund due.")),
        ref=f"affiliate_manage:{program.id}",
    ))
    db.commit()
    db.refresh(program)

    return {"math": math_result, "transfers": transfers, "refund": rf, "errors": errors}


def verify_delivery(db: Session, deal: Deal, reviewer: User, decision: str,
                    notes: Optional[str] = None,
                    verified_quantity: Optional[int] = None) -> Verification:
    """Record a human reviewer's verification decision on submitted evidence.

    Only ever called from the reviewer-only endpoint, on a funded deal that has
    real stored proof. Sets verified_at on approval — never by a timer, a step
    being reached, or a deal party clicking through their own flow.

    verified_quantity is the reviewer's own confirmed number (views/
    impressions) for a per_view/per_impression deal — recorded here, on the
    decision itself, not on Proof (which is only ever what the platform owner
    submitted, unverified). The later pool-settlement step reads this value
    rather than re-deriving it. Always None for a plain fixed deal.
    """
    v = Verification(deal_id=deal.id, reviewer_id=reviewer.id,
                     decision=decision, notes=notes,
                     verified_quantity=verified_quantity)
    db.add(v)

    if decision == "approved":
        deal.verified_at = datetime.utcnow()
        deal.status = DealStatus.VERIFIED
        db.add(Notification(user_id=deal.platform_owner_id, type="deal_verified",
                            body=f"Deal #{deal.id} delivery verified — payout to follow.",
                            ref=str(deal.id)))
        db.add(Notification(user_id=deal.business_id, type="deal_verified",
                            body=f"Deal #{deal.id} delivery verified by PromoSlot.",
                            ref=str(deal.id)))
    else:
        deal.status = DealStatus.IN_DELIVERY
        db.add(Notification(
            user_id=deal.platform_owner_id, type="deal_revision",
            body=(f"Deal #{deal.id} evidence needs revision before it can be verified."
                  + (f" Reviewer note: {notes.strip()}" if notes and notes.strip() else "")),
            ref=str(deal.id)))

    db.commit()
    db.refresh(deal)
    return v


def open_proof_grace_period(db: Session, deal: Deal, reviewer: User,
                            note: str = "", hours: int = 24) -> datetime:
    """Give a platform owner a fixed window to add more delivery proof before
    a per_view/per_impression deal is finalized, when a reviewer suspects the
    submitted evidence undersells actual delivery.

    Only ever called from the reviewer-only /review/deals/{id}/verify
    endpoint, alongside a "changes_requested" decision — this is a distinct,
    explicit action a reviewer opts into, never automatic. Sets
    Deal.proof_grace_deadline, which two places then enforce: routers/review.py
    blocks approving straight out of CHANGES_REQUESTED while it's still in the
    future, and settle_pool_deal's caller blocks final settlement the same way.
    If nothing further is added before it closes, the reviewer approves using
    only what was already formally submitted — never a reviewer's own private
    research, since that's the one thing the business can't independently see
    in the deal record (see routers/proofs.py's _is_party check).

    Deliberately does NOT attempt to auto-classify the eventual outcome as
    fraud vs. an honest mistake — that's a human judgment call for whoever
    reviews what happens (or doesn't) during the window, made with PromoSlot's
    existing suspension/audit tools, not something this function decides.
    """
    deadline = datetime.utcnow() + timedelta(hours=hours)
    deal.proof_grace_deadline = deadline
    db.add(Notification(
        user_id=deal.platform_owner_id, type="proof_grace_period_opened",
        body=(f"Deal #{deal.id}: you have until {deadline.isoformat()} to add more "
              "delivery proof before it's finalized with what's already submitted."
              + (f" Reviewer note: {note.strip()}" if note and note.strip() else "")),
        ref=str(deal.id)))
    db.add(Notification(
        user_id=deal.business_id, type="proof_grace_period_opened_business",
        body=(f"Deal #{deal.id}: PromoSlot has asked the platform owner for additional "
              "delivery proof before finalizing payout. This is routine caution, not an "
              "accusation — you'll be updated once it's resolved."),
        ref=str(deal.id)))
    db.commit()
    db.refresh(deal)
    return deadline


def create_deal_payout(db: Session, deal: Deal, destination: str) -> Transfer:
    """Move funds to the platform owner via a REAL Stripe Transfer.

    The deal is marked PAID only because stripe.Transfer.create() actually
    succeeded (money moved from the platform balance to the connected account).
    Caller must have already verified funded + verified + not paid + destination
    payout-enabled. Raises on Stripe failure so the caller leaves the deal unpaid.
    """
    m = deal_money_for(deal)
    net = m["net_to_owner"]

    tr = stripe.Transfer.create(
        amount=net,
        currency=deal.currency,
        destination=destination,
        # Draw specifically from this deal's charge (correct availability/timing).
        source_transaction=deal.charge_id,
        transfer_group=f"deal_{deal.id}",
        metadata={"deal_id": str(deal.id), "promoslot": "deal_payout"},
    )

    deal.transfer_id = tr.id
    deal.paid_at = datetime.utcnow()
    deal.status = DealStatus.PAID
    db.add(Transfer(
        deal_id=deal.id,
        stripe_transfer_id=tr.id,
        destination_account=destination,
        amount=net,
        currency=deal.currency,
        status="paid",
    ))
    db.add(Notification(user_id=deal.platform_owner_id, type="payout_sent",
                        body=f"Payout of {deal.currency.upper()} {net/100:.2f} sent for deal #{deal.id} "
                             f"(listed price minus {deal.seller_fee_percent}% seller fee).",
                        ref=str(deal.id)))
    db.add(Notification(user_id=deal.business_id, type="deal_completed",
                        body=f"Deal #{deal.id} completed — payout released to the platform owner.",
                        ref=str(deal.id)))
    db.commit()
    db.refresh(deal)
    return tr


def pool_settlement_for(deal: Deal, verified_quantity: int) -> dict:
    """Pure math for settling a per_view/per_impression pool — no Stripe, no DB.

    Pays only for complete priced units, floor-rounded (agreed explicitly:
    real view counts are never round, so payout is always in whole units of
    rate_unit_quantity rather than trying to force reality to be tidy).
    Fee is only ever taken on the released slice — reuses deal_money() twice
    (once for the full pool, once for the released slice) rather than a new
    formula, so refund = (what was charged for the pool) - (what's kept for
    the released slice) can never drift from what deal_money() would compute
    for either amount on its own.
    """
    units = verified_quantity // deal.rate_unit_quantity if deal.rate_unit_quantity else 0
    gross = units * deal.rate_unit_pence
    gross = min(gross, deal.pool_max_budget or 0)   # can never release more than was funded

    charged_for_pool = deal_money(deal.pool_max_budget or 0, deal.seller_fee_percent, deal.buyer_fee_percent)
    kept_for_released = deal_money(gross, deal.seller_fee_percent, deal.buyer_fee_percent)

    return {
        "verified_quantity": verified_quantity,
        "units": units,
        "pool_gross": gross,
        "pool_net_to_owner": kept_for_released["net_to_owner"],
        "pool_platform_take": kept_for_released["platform_take"],
        "refund_to_business": charged_for_pool["charge_amount"] - kept_for_released["charge_amount"],
    }


def settle_pool_deal(db: Session, deal: Deal, destination: str, verified_quantity: int) -> dict:
    """Settle a per_view/per_impression (or hybrid — same model with
    listed_price also >0) deal: one combined Transfer (fixed portion, if any,
    + released pool slice) to the platform owner, plus one partial Refund
    (unused pool + its unused fee) back to the business if anything's left.

    Transfer happens first and is committed to the DB before the refund is
    even attempted — if the refund call then fails, the deal must still
    correctly show as paid (money already moved for real), not be lost or
    rolled back, so a failed refund never hides a successful transfer.
    Caller must have already verified: verified + not paid + destination
    payout-enabled + pricing_model is a pool model + no open grace period.
    """
    fixed = deal_money_for(deal)                       # listed_price side, unaffected by any of this
    pool = pool_settlement_for(deal, verified_quantity)

    total_net_to_owner = fixed["net_to_owner"] + pool["pool_net_to_owner"]

    tr = stripe.Transfer.create(
        amount=total_net_to_owner,
        currency=deal.currency,
        destination=destination,
        source_transaction=deal.charge_id,
        transfer_group=f"deal_{deal.id}",
        metadata={"deal_id": str(deal.id), "promoslot": "pool_deal_payout",
                 "verified_quantity": str(verified_quantity)},
    )
    deal.transfer_id = tr.id
    deal.paid_at = datetime.utcnow()
    deal.status = DealStatus.PAID
    deal.pool_released_amount = pool["pool_gross"]
    deal.pool_settled_at = datetime.utcnow()
    db.add(Transfer(deal_id=deal.id, stripe_transfer_id=tr.id, destination_account=destination,
                    amount=total_net_to_owner, currency=deal.currency, status="paid"))
    db.add(Notification(user_id=deal.platform_owner_id, type="payout_sent",
                        body=f"Payout of {deal.currency.upper()} {total_net_to_owner/100:.2f} sent for "
                             f"deal #{deal.id} ({pool['units']} verified unit(s) of "
                             f"{deal.rate_unit_quantity} + any fixed base).",
                        ref=str(deal.id)))
    # Commit now — the Transfer already happened for real in Stripe, so this
    # must be durable regardless of what the refund call below does next.
    db.commit()
    db.refresh(deal)

    refund_amount = pool["refund_to_business"]
    rf = None
    if refund_amount > 0:
        rf = stripe.Refund.create(
            payment_intent=deal.payment_intent_id,
            amount=refund_amount,
            reason="requested_by_customer",
            metadata={"deal_id": str(deal.id), "promoslot": "pool_unused_refund"},
        )
        deal.refund_id = rf.id
        deal.pool_refunded_amount = refund_amount
        db.add(Notification(user_id=deal.business_id, type="deal_completed",
                            body=f"Deal #{deal.id} settled — unused pool balance of "
                                 f"{deal.currency.upper()} {refund_amount/100:.2f} refunded to you.",
                            ref=str(deal.id)))
    else:
        deal.pool_refunded_amount = 0
        db.add(Notification(user_id=deal.business_id, type="deal_completed",
                            body=f"Deal #{deal.id} settled — full pool budget was earned, no refund due.",
                            ref=str(deal.id)))
    db.commit()
    db.refresh(deal)

    return {"transfer": tr, "refund": rf, "fixed": fixed, "pool": pool,
            "total_net_to_owner": total_net_to_owner}


def check_instant_eligibility(stripe_account_id: str) -> dict:
    """Live check: does this connected account have any external account
    (bank or card) Stripe will do an Instant Payout to right now?

    Never cached — Stripe can re-assess instant eligibility over time, and
    caching a stale "yes" could send an owner down a payout path that fails.

    Stripe's response objects here (ListObject/StripeObject) do NOT support
    dict-style .get() the way a plain dict does — calling .get() on them
    falls through to their __getattr__/__getitem__ machinery and raises a
    raw KeyError instead of returning a default. Every Stripe object is
    converted to a plain dict via .to_dict() (recursive) immediately after
    the API call, before anything touches it with .get().
    """
    destinations = []
    for obj_type in ("bank_account", "card"):
        try:
            accounts = stripe.Account.list_external_accounts(
                stripe_account_id, object=obj_type, limit=10)
            data = accounts.to_dict().get("data", [])
        except Exception:
            continue
        for ext in data:
            methods = ext.get("available_payout_methods") or []
            if "instant" in methods:
                destinations.append({
                    "id": ext.get("id"), "type": obj_type,
                    "last4": ext.get("last4"), "brand": ext.get("brand") or ext.get("bank_name"),
                })
    return {"eligible": bool(destinations), "destinations": destinations}


def try_instant_payout(db: Session, deal: Deal, connected_account: ConnectedAccount) -> dict:
    """Convert an already-PAID deal's payout into a real Stripe Instant Payout,
    on top of the Transfer create_deal_payout() already made into the owner's
    Connect balance. Never touches deal.paid_at/status — those are already
    set. Only ever sets the instant_* detail fields on success.

    Deliberately returns a status dict instead of raising for expected/
    recoverable outcomes (not eligible, no balance, Stripe declines it), so
    an auto-triggered attempt (opted-in owner) can never break the main
    payout-release flow it's piggybacking on. Genuine Stripe API failures
    are caught too, for the same reason — see reason strings below.
    """
    if deal.paid_at is None:
        return {"ok": False, "reason": "not_paid_yet"}
    if deal.instant_payout_id:
        return {"ok": False, "reason": "already_instant"}

    elig = check_instant_eligibility(connected_account.stripe_account_id)
    if not elig["eligible"]:
        return {"ok": False, "reason": "not_eligible"}

    try:
        bal_obj = stripe.Balance.retrieve(
            stripe_account=connected_account.stripe_account_id,
            expand=["instant_available.net_available"],
        )
        bal = bal_obj.to_dict()  # see check_instant_eligibility: .get() isn't safe on the raw object
    except Exception as e:
        return {"ok": False, "reason": f"balance_lookup_failed: {e}"}

    # net_available.amount is ALREADY net of whatever instant-payout fee is
    # configured on the platform (Stripe requires using this exact figure
    # when monetizing instant payouts via Application Fees — the owner bears
    # this fee, per PromoSlot's pricing decision, not PromoSlot).
    eligible_ids = {d["id"] for d in elig["destinations"]}
    dest_id, net_amount = None, None
    for bucket in (bal.get("instant_available") or []):
        if bucket.get("currency") != deal.currency:
            continue
        for entry in (bucket.get("net_available") or []):
            if entry.get("destination") in eligible_ids:
                dest_id, net_amount = entry["destination"], entry["amount"]
                break
        if dest_id:
            break

    if not dest_id or not net_amount:
        return {"ok": False, "reason": "no_instant_balance_available"}

    try:
        payout = stripe.Payout.create(
            amount=net_amount,
            currency=deal.currency,
            method="instant",
            destination=dest_id,
            metadata={"deal_id": str(deal.id), "promoslot": "instant_payout"},
            stripe_account=connected_account.stripe_account_id,
        )
    except Exception as e:
        return {"ok": False, "reason": f"payout_failed: {e}"}

    deal.instant_payout_id = payout.id
    deal.instant_net_amount = net_amount
    deal.instant_requested_at = datetime.utcnow()
    db.add(Notification(
        user_id=deal.platform_owner_id, type="instant_payout_sent",
        body=(f"Instant payout sent for deal #{deal.id} — "
              f"{deal.currency.upper()} {net_amount/100:.2f} should land in your account "
              f"within about 30 minutes (Stripe's instant-payout fee already deducted)."),
        ref=str(deal.id)))
    db.commit()
    db.refresh(deal)
    return {"ok": True, "payout_id": payout.id, "net_amount": net_amount}


def _payout_admin_ids(db: Session):
    """Everyone who can act on a failed/reversed payout (same permission that
    gates releasing one in the first place)."""
    roles = [r for r, perms in ROLE_PERMISSIONS.items() if Perm.PAYOUT_RELEASE in perms]
    if not roles:
        return []
    rows = (db.query(User.id)
            .filter(User.role.in_(roles),
                    User.suspended_at.is_(None), User.banned_at.is_(None),
                    User.deactivated_at.is_(None)).all())
    return [r[0] for r in rows]


def handle_payout_event(db: Session, event: dict, succeeded: bool) -> str:
    """payout.paid / payout.failed on a connected account's real bank/card payout.

    Distinct from create_deal_payout()'s Transfer: money can successfully move
    into the owner's Connect balance (Transfer succeeds, deal marked PAID) while
    the SEPARATE, later real-world payout to their actual bank still fails
    (closed account, mismatched details, bank rejects it). Without this handler
    that failure is invisible — the deal stays PAID forever and nobody is ever
    told the owner didn't actually receive the money.

    Delivered as a Connect-scoped event (has a top-level "account" field) — the
    destination must have "listen to events on connected accounts" enabled, or
    these never arrive at all.

    Deliberately never touches deal.status/paid_at/instant_payout_id — those
    stay true to "the Transfer into their Connect balance succeeded", a real
    and distinct fact from "the bank payout succeeded". This only notifies +
    audits, so a human decides what to do next. A full reconciliation/ledger
    system is a bigger, deliberate design (see Phase 2 backlog), not this.
    """
    account_id = event["account"] if "account" in event else None
    if not account_id:
        return "ignored"  # not a Connect-scoped event we can attribute to anyone

    ca = db.query(ConnectedAccount).filter_by(stripe_account_id=account_id).first()
    if ca is None:
        return "ignored"  # not one of our connected accounts

    # Stripe's response objects don't support dict-style .get() — see the fix
    # in check_instant_eligibility. Convert to a plain dict before touching it.
    payout = event["data"]["object"].to_dict()
    payout_id = payout.get("id")
    amount = payout.get("amount") or 0
    currency = (payout.get("currency") or "gbp").upper()
    failure_message = payout.get("failure_message")
    deal_id_hint = (payout.get("metadata") or {}).get("deal_id")  # only set for our own instant payouts

    deal_note = ""
    if deal_id_hint:
        try:
            deal = db.query(Deal).filter_by(id=int(deal_id_hint)).first()
        except (TypeError, ValueError):
            deal = None
        if deal is not None:
            deal_note = f" (deal #{deal.id})"

    if succeeded:
        # Routine/expected outcome — audit trail only, no notification noise.
        audit.record(db, actor=None, action="payout.paid", target_type="connected_account",
                     target_id=ca.id, new_state={"payout_id": payout_id, "amount": amount,
                                                 "currency": currency},
                     reason=f"Real bank payout confirmed{deal_note}.")
        db.commit()
        return "applied"

    db.add(Notification(
        user_id=ca.user_id, type="payout_failed",
        body=(f"A payout of {currency} {amount/100:.2f} to your bank/card failed"
              f"{deal_note}. Your money is safe and hasn't been lost — PromoSlot's team "
              f"will be in touch to help resolve this."),
        ref=str(ca.id)))
    for uid in _payout_admin_ids(db):
        db.add(Notification(
            user_id=uid, type="payout_failed_admin",
            body=(f"Payout FAILED for owner #{ca.user_id}{deal_note}: {currency} {amount/100:.2f}. "
                  f"Stripe says: {failure_message or 'no reason given'}. Needs manual follow-up."),
            ref=f"payout:{payout_id}"))
    audit.record(db, actor=None, action="payout.failed", target_type="connected_account",
                 target_id=ca.id, new_state={"payout_id": payout_id, "amount": amount,
                                             "currency": currency, "failure_message": failure_message},
                 reason=f"Real bank payout failed{deal_note} — needs manual review.")
    db.commit()
    return "applied"


def handle_transfer_reversed(db: Session, event: dict) -> str:
    """transfer.reversed — the platform-level Transfer that already moved money
    into an owner's Connect balance got reversed back to us.

    Platform-scoped (no "account" field needed) — matched to a deal via the
    Transfer id stored on it at payout time. Deliberately doesn't touch
    deal.status/paid_at; this is a rare, serious event that needs a human to
    look at it, not an automated state change.
    """
    tr = event["data"]["object"].to_dict()
    transfer_id = tr.get("id")
    deal = db.query(Deal).filter_by(transfer_id=transfer_id).first()
    if deal is None:
        return "ignored"

    amount_reversed = tr.get("amount_reversed") or 0
    for uid in (deal.business_id, deal.platform_owner_id):
        db.add(Notification(
            user_id=uid, type="payout_reversed",
            body=(f"A payout for deal #{deal.id} was reversed by Stripe. "
                  f"PromoSlot's team will review and follow up with you directly."),
            ref=str(deal.id)))
    for uid in _payout_admin_ids(db):
        db.add(Notification(
            user_id=uid, type="payout_reversed_admin",
            body=(f"Transfer reversed for deal #{deal.id} "
                  f"({deal.currency.upper()} {amount_reversed/100:.2f}) — needs manual review."),
            ref=str(deal.id)))
    audit.record(db, actor=None, action="transfer.reversed", target_type="deal",
                 target_id=deal.id,
                 new_state={"transfer_id": transfer_id, "amount_reversed": amount_reversed},
                 reason="Stripe transfer.reversed webhook — needs manual review, deal status left untouched.")
    db.commit()
    return "applied"


def refund_deal(db: Session, deal: Deal, reason: str = "requested_by_customer"):
    """Refund the business via a REAL Stripe Refund on the deal's PaymentIntent.

    Only marks REFUNDED because stripe.Refund.create() actually succeeded.
    Caller must have ensured the deal is funded and not already paid out.
    """
    rf = stripe.Refund.create(
        payment_intent=deal.payment_intent_id,
        reason=reason,
        metadata={"deal_id": str(deal.id), "promoslot": "deal_refund"},
    )
    deal.refund_id = rf.id
    deal.status = DealStatus.REFUNDED
    db.add(Notification(user_id=deal.business_id, type="deal_refunded",
                        body=f"Deal #{deal.id} was refunded to you.", ref=str(deal.id)))
    db.add(Notification(user_id=deal.platform_owner_id, type="deal_refunded",
                        body=f"Deal #{deal.id} was refunded to the business.", ref=str(deal.id)))
    db.commit()
    db.refresh(deal)
    return rf


def confirm_refund_from_charge(db: Session, charge_id: str) -> Optional[Deal]:
    """Idempotently mark a deal refunded from a charge.refunded webhook.

    Re-verifies with Stripe that the charge is actually refunded before changing
    state (handles refunds initiated from the Stripe dashboard too).
    """
    deal = db.query(Deal).filter_by(charge_id=charge_id).first()
    if deal is None or deal.status == DealStatus.REFUNDED:
        return deal
    try:
        ch = stripe.Charge.retrieve(charge_id)
    except Exception:
        return deal
    if not getattr(ch, "refunded", False):
        return deal
    deal.status = DealStatus.REFUNDED
    db.commit()
    db.refresh(deal)
    return deal


# ============================================================================
# Chargeback disputes (charge.dispute.* webhooks)
#
# PromoSlot's Connect config (separate charges & transfers, fees_collector /
# losses_collector = "application" — see routers/connect.py) makes PromoSlot,
# never the platform owner's connected account, the party Stripe holds
# responsible for a dispute. That's the assumption these functions rely on: an
# admin manages the response, so reason codes / the Stripe dispute id / the
# evidence deadline stay admin-only (routers/disputes.py). Both parties only
# ever get a read-only "payment dispute under review" state, derived from
# Deal.dispute_status — never the raw Stripe status or reason.
# ============================================================================

def _dispute_admin_ids(db: Session):
    """Everyone who can work the disputes queue (same permission that gates it)."""
    roles = [r for r, perms in ROLE_PERMISSIONS.items() if Perm.DISPUTE_MANAGE in perms]
    if not roles:
        return []
    rows = (db.query(User.id)
            .filter(User.role.in_(roles),
                    User.suspended_at.is_(None), User.banned_at.is_(None),
                    User.deactivated_at.is_(None)).all())
    return [r[0] for r in rows]


def _notify_parties_and_admins(db: Session, deal: Deal, dispute: Dispute,
                               party_body: str, admin_body: str, notif_type: str) -> None:
    for uid in (deal.business_id, deal.platform_owner_id):
        db.add(Notification(user_id=uid, type=notif_type, body=party_body, ref=str(deal.id)))
    for uid in _dispute_admin_ids(db):
        db.add(Notification(user_id=uid, type=f"{notif_type}_admin", body=admin_body,
                            ref=f"dispute:{dispute.id}"))


def open_dispute_from_event(db: Session, stripe_dispute_id: str, deal: Deal) -> Optional[Dispute]:
    """Idempotently create a Dispute row from a charge.dispute.created webhook.

    `deal` is resolved by the caller from the event's charge id before this is
    called — a charge with no matching deal never reaches here (that's the
    webhook dispatcher's IGNORED case). Re-retrieves the Dispute from Stripe
    rather than trusting the webhook payload alone, matching
    mark_deal_funded_from_pi / confirm_refund_from_charge. Returns None only
    when Stripe couldn't be reached this attempt (caller asks for redelivery).
    """
    existing = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if existing is not None:
        return existing  # already recorded — idempotent on redelivery

    try:
        dp = stripe.Dispute.retrieve(stripe_dispute_id)
    except Exception:
        return None

    payout_already_released = deal.paid_at is not None
    due_by = getattr(dp, "evidence_details", None) and dp.evidence_details.get("due_by")

    dispute = Dispute(
        deal_id=deal.id,
        stripe_dispute_id=dp.id,
        charge_id=deal.charge_id,
        amount=dp.amount,
        currency=dp.currency,
        reason=getattr(dp, "reason", None),
        status=dp.status,
        evidence_due_by=datetime.utcfromtimestamp(due_by) if due_by else None,
        payout_already_released=payout_already_released,
        deal_status_before=None if payout_already_released else deal.status,
    )
    db.add(dispute)
    deal.dispute_status = dp.status

    # Freeze an unpaid deal so nothing else can happen to it mid-dispute — but
    # only if that's actually a legal move from its current state (defensive;
    # every real pre-payout state allows -> DISPUTED, see deal_state.py). Must
    # capture status_before_dispute BEFORE overwriting deal.status, or the
    # revert on a won/withdrawn outcome has nothing to go back to.
    frozen = False
    if not payout_already_released and can_transition(deal.status, DealStatus.DISPUTED):
        deal.status_before_dispute = deal.status
        deal.status = DealStatus.DISPUTED
        frozen = True

    db.commit()
    db.refresh(dispute)

    db.add(DisputeEvent(
        dispute_id=dispute.id, kind="system",
        body=(f"Dispute opened — reason: {dispute.reason or 'unspecified'}. "
              f"{'Deal frozen pending resolution.' if frozen else ''}"
              f"{'Payout had already been released — this is an absorbed loss, not a freeze.' if payout_already_released else ''}"),
    ))
    _notify_parties_and_admins(
        db, deal, dispute,
        party_body=(f"A payment dispute has been opened on deal #{deal.id}. "
                    f"PromoSlot is reviewing it and will contact you if evidence is needed."),
        admin_body=(f"Payment dispute opened on deal #{deal.id} "
                    f"({dispute.currency.upper()} {dispute.amount/100:.2f})"
                    f"{' — payout already released' if payout_already_released else ''}."),
        notif_type="dispute_opened",
    )
    db.commit()
    db.refresh(dispute)
    return dispute


def update_dispute_from_event(db: Session, stripe_dispute_id: str, deal: Deal) -> Optional[Dispute]:
    """Handle charge.dispute.updated — status/evidence-deadline changes."""
    dispute = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if dispute is None:
        return open_dispute_from_event(db, stripe_dispute_id, deal)  # missed the opener
    if dispute.closed_at is not None:
        return dispute  # already closed — an update landing late changes nothing

    try:
        dp = stripe.Dispute.retrieve(stripe_dispute_id)
    except Exception:
        return None

    due_by = getattr(dp, "evidence_details", None) and dp.evidence_details.get("due_by")
    new_due_by = datetime.utcfromtimestamp(due_by) if due_by else None
    if dp.status != dispute.status:
        db.add(DisputeEvent(dispute_id=dispute.id, kind="system",
                            body=f"Status changed: {dispute.status} → {dp.status}."))
    dispute.status = dp.status
    dispute.evidence_due_by = new_due_by
    deal.dispute_status = dp.status
    db.commit()
    db.refresh(dispute)
    return dispute


def close_dispute_from_event(db: Session, stripe_dispute_id: str, deal: Deal) -> Optional[Dispute]:
    """Handle charge.dispute.closed — resolves the deal's frozen/paid state.

    won | warning_closed  -> unpaid deal returns to exactly the status it was
                              frozen from; a paid deal was never touched anyway.
    lost                  -> Stripe has already reversed the charge as part of
                              losing the dispute (no separate Refund call is
                              valid or needed). An unpaid deal is marked
                              REFUNDED to match reality. A paid deal stays PAID
                              — per policy, no automatic clawback from the
                              platform owner — but the Dispute row's outcome
                              records this as a real absorbed loss to reconcile.
    """
    dispute = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if dispute is None:
        dispute = open_dispute_from_event(db, stripe_dispute_id, deal)
        if dispute is None:
            return None
    if dispute.closed_at is not None:
        return dispute  # idempotent on redelivery

    try:
        dp = stripe.Dispute.retrieve(stripe_dispute_id)
    except Exception:
        return None
    if dp.status not in ("won", "lost", "warning_closed"):
        return None  # not actually closed yet despite the event name — wait for the real close

    dispute.status = dp.status
    dispute.outcome = dp.status
    dispute.closed_at = datetime.utcnow()

    if not dispute.payout_already_released:
        if dp.status == "lost":
            deal.status = DealStatus.REFUNDED
        else:  # won | warning_closed — restore exactly what it was frozen from.
               # deal.status_before_dispute is the live working value; Dispute
               # .deal_status_before is kept as the permanent audit record even
               # after the Deal's own field is cleared below.
            deal.status = deal.status_before_dispute or dispute.deal_status_before or DealStatus.FUNDED
        deal.status_before_dispute = None
    deal.dispute_status = None  # badge clears either way — case is resolved

    db.commit()
    db.refresh(dispute)

    outcome_line = {
        "lost": "The payment was refunded to the business.",
        "won": "The deal has resumed as normal.",
        "warning_closed": "The deal has resumed as normal.",
    }[dp.status]
    db.add(DisputeEvent(dispute_id=dispute.id, kind="system",
                        body=f"Dispute closed — outcome: {dp.status}."))
    _notify_parties_and_admins(
        db, deal, dispute,
        party_body=f"The payment dispute on deal #{deal.id} has been resolved. {outcome_line}",
        admin_body=f"Dispute on deal #{deal.id} closed — outcome: {dp.status}.",
        notif_type="dispute_closed",
    )
    db.commit()
    db.refresh(dispute)
    return dispute


def record_dispute_funds_event(db: Session, stripe_dispute_id: str, deal: Deal,
                               kind: str) -> Optional[Dispute]:
    """Handle charge.dispute.funds_withdrawn / funds_reinstated.

    Informational only — payout_already_released was already captured at
    dispute-open time, so this doesn't change deal or dispute status, just logs
    exactly when the money actually moved (useful for reconciliation).
    """
    dispute = db.query(Dispute).filter_by(stripe_dispute_id=stripe_dispute_id).first()
    if dispute is None:
        dispute = open_dispute_from_event(db, stripe_dispute_id, deal)
        if dispute is None:
            return None
    now = datetime.utcnow()
    if kind == "withdrawn":
        dispute.funds_withdrawn_at = now
        body = "Funds withdrawn from PromoSlot's Stripe balance."
    else:
        dispute.funds_reinstated_at = now
        body = "Funds reinstated to PromoSlot's Stripe balance."
    db.add(DisputeEvent(dispute_id=dispute.id, kind="system", body=body))
    db.commit()
    db.refresh(dispute)
    return dispute
