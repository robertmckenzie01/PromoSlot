"""Account risk signals (task #32).

Nothing here decides anything automatically — every suspend/ban/reject
action on PromoSlot is, and remains, a deliberate human call (see
routers/admin.py's suspend_user/ban_user, routers/verification.py's
reject). This module exists to answer the question an admin currently has
to manually piece together across four separate screens before making that
call: "why does this account look risky, and by how much?" — account age,
dispute/chargeback history (as the paying business AND as the platform
owner who might have already been paid before a chargeback landed),
verification rejection history, and past moderation actions, pulled into
one real, computed picture instead of nothing.

Dispute risk is deliberately split by role, because the two roles carry
genuinely different exposure:
  - AS THE BUSINESS: Deal.business_id is whose card gets charged, so a
    chargeback reflects on THEM (their card issuer disputed the charge) —
    disputes_as_business / lost_disputes_as_business.
  - AS THE PLATFORM OWNER: Deal.platform_owner_id is who gets paid out. A
    lost dispute where the owner had ALREADY been paid is a real absorbed
    loss for the platform (see Dispute.payout_already_released, and
    backend/ledger.py's absorbed_loss_total() for the platform-wide total)
    — attributing it to the owner here isn't blaming them for the
    chargeback itself (that's the business's card issue), it's surfacing
    that PromoSlot has real, unrecovered exposure tied to paying this
    owner quickly, which is exactly the kind of thing a reviewer deciding
    whether to trust their NEXT payout request should be able to see.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from .models import AccountVerificationRequest, AdminAuditLog, Deal, Dispute, User


def account_risk_summary(db: Session, user_id: int) -> dict:
    """A real, computed risk picture for one account — used to enrich the
    verification queue (routers/verification.py's _submitter_context) and
    the unified admin console (routers/admin_console.py), rather than
    leaving a reviewer to separately browse disputes/ledger/audit-log
    screens themselves before making a judgment call."""
    user = db.get(User, user_id)
    if user is None:
        return {}

    account_age_days = (datetime.utcnow() - user.created_at).days if user.created_at else None

    business_deal_ids = [row[0] for row in db.query(Deal.id).filter(Deal.business_id == user_id).all()]
    disputes_as_business = (db.query(Dispute).filter(Dispute.deal_id.in_(business_deal_ids)).all()
                            if business_deal_ids else [])
    open_disputes_as_business = sum(1 for d in disputes_as_business if d.closed_at is None)
    lost_disputes_as_business = sum(1 for d in disputes_as_business if d.outcome == "lost")

    owner_deal_ids = [row[0] for row in db.query(Deal.id).filter(Deal.platform_owner_id == user_id).all()]
    absorbed_as_owner = (db.query(Dispute)
                         .filter(Dispute.deal_id.in_(owner_deal_ids),
                                 Dispute.payout_already_released.is_(True),
                                 Dispute.outcome == "lost").all()
                         if owner_deal_ids else [])
    absorbed_loss_as_owner = sum(d.amount for d in absorbed_as_owner)

    prior_rejected_avr = (db.query(AccountVerificationRequest)
                          .filter(AccountVerificationRequest.submitted_by == user_id,
                                  AccountVerificationRequest.status == "rejected")
                          .count())

    moderation_actions = (db.query(AdminAuditLog)
                          .filter(AdminAuditLog.target_type == "user",
                                  AdminAuditLog.target_id == str(user_id),
                                  AdminAuditLog.action.in_(["user.suspend", "user.ban"]))
                          .count())

    return {
        "user_id": user_id,
        "account_age_days": account_age_days,
        "disputes_as_business": len(disputes_as_business),
        "open_disputes_as_business": open_disputes_as_business,
        "lost_disputes_as_business": lost_disputes_as_business,
        "absorbed_loss_as_owner": absorbed_loss_as_owner,   # pence — see module docstring
        "prior_rejected_verifications": prior_rejected_avr,
        "prior_moderation_actions": moderation_actions,
        "currently_suspended": user.suspended_at is not None,
        "currently_banned": user.banned_at is not None,
    }
