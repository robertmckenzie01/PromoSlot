"""Permanently delete test accounts and everything tied to them.

This is a destructive, irreversible maintenance script — it is deliberately
NOT wired into the app or any admin endpoint. It exists for one-off pre-launch
cleanup of obviously-fake accounts (e.g. anything@example.com) before real
users exist, run by a human, from the command line, on purpose.

Usage:
    # 1. Dry run (default, no changes) — always do this first.
    python -m scripts.delete_test_accounts "@example"

    # 2. Real run, once the dry-run report looks right.
    python -m scripts.delete_test_accounts "@example" --confirm

Safety design:
  - Dry run by default. Nothing is deleted unless --confirm is passed AND you
    then type the exact confirmation phrase it asks for interactively.
  - The pattern must be at least 4 characters and contain "@", so a fat-fingered
    near-empty pattern can't match the whole users table.
  - Cross-boundary protection: if a deal, conversation, platform, or campaign
    involves BOTH a matched (test) account and an account that does NOT match
    the pattern, it is left alone and reported, never silently deleted. This
    is what stops a test account's real counterpart's history from being
    destroyed as a side effect.
  - Audit-log protection: admin_audit_log is append-only (DB triggers reject
    UPDATE/DELETE on it — see the Alembic migration). Any matched user who has
    ever acted as actor_id on an audit log row cannot be deleted without
    violating that immutability, so such a user is entirely excluded from the
    run (nothing about them is touched) and reported for manual review.
  - Everything happens in one transaction: any error rolls back the whole
    thing rather than leaving a half-deleted mess.
"""
import sys

from sqlalchemy import func

from backend.db import SessionLocal
from backend.models import (
    AdminAuditLog, Campaign, ConnectedAccount, Conversation, Deal, Dispute,
    DisputeEvent, EmailVerificationToken, Message, Notification,
    PasswordResetToken, Payment, Platform, PlatformMedia, ProfileAsset,
    Proof, Review, Session, SupportTicket, SupportTicketEvent, Transfer,
    User, Verification,
)

MIN_PATTERN_LEN = 4


def find_matched_users(db, pattern):
    return (
        db.query(User)
        .filter(func.lower(User.email).like(f"%{pattern.lower()}%"))
        .order_by(User.id)
        .all()
    )


def build_plan(db, matched_users):
    """Compute exactly what would be deleted, and what gets skipped and why.

    Returns a dict describing the plan; nothing is written to the DB here.
    """
    matched_ids = {u.id for u in matched_users}

    # --- audit-log protection: exclude any user who has ever acted as admin ---
    blocked_ids = {
        row.actor_id
        for row in db.query(AdminAuditLog.actor_id)
        .filter(AdminAuditLog.actor_id.in_(matched_ids))
        .distinct()
        if row.actor_id is not None
    }
    deletable_ids = matched_ids - blocked_ids

    # --- deals: only delete if BOTH sides are in the deletable set ---
    all_touching_deals = (
        db.query(Deal)
        .filter(
            (Deal.business_id.in_(matched_ids)) | (Deal.platform_owner_id.in_(matched_ids))
        )
        .all()
    )
    deletable_deals = [
        d for d in all_touching_deals
        if d.business_id in deletable_ids and d.platform_owner_id in deletable_ids
    ]
    cross_boundary_deals = [d for d in all_touching_deals if d not in deletable_deals]
    deletable_deal_ids = {d.id for d in deletable_deals}

    # --- platforms: only delete if no deal outside the deletable set references it ---
    all_touching_platforms = db.query(Platform).filter(Platform.owner_id.in_(matched_ids)).all()
    kept_deal_platform_ids = {
        d.platform_id for d in all_touching_deals
        if d.id not in deletable_deal_ids and d.platform_id is not None
    }
    deletable_platforms = [
        p for p in all_touching_platforms
        if p.owner_id in deletable_ids and p.id not in kept_deal_platform_ids
    ]
    cross_boundary_platforms = [p for p in all_touching_platforms if p not in deletable_platforms]

    # --- campaigns: same rule ---
    all_touching_campaigns = db.query(Campaign).filter(Campaign.business_id.in_(matched_ids)).all()
    kept_deal_campaign_ids = {
        d.campaign_id for d in all_touching_deals
        if d.id not in deletable_deal_ids and d.campaign_id is not None
    }
    deletable_campaigns = [
        c for c in all_touching_campaigns
        if c.business_id in deletable_ids and c.id not in kept_deal_campaign_ids
    ]
    cross_boundary_campaigns = [c for c in all_touching_campaigns if c not in deletable_campaigns]

    # --- conversations: only delete if BOTH participants are deletable ---
    all_touching_convos = (
        db.query(Conversation)
        .filter((Conversation.user_lo.in_(matched_ids)) | (Conversation.user_hi.in_(matched_ids)))
        .all()
    )
    deletable_convos = [
        c for c in all_touching_convos
        if c.user_lo in deletable_ids and c.user_hi in deletable_ids
    ]
    cross_boundary_convos = [c for c in all_touching_convos if c not in deletable_convos]
    deletable_convo_ids = {c.id for c in deletable_convos}

    # --- second pass: a matched user referenced by any KEPT cross-boundary
    # record (deal, platform, campaign, conversation) must not be deleted
    # either — deleting them would leave that surviving record pointing at a
    # user that no longer exists. This is the same protection as blocked_ids,
    # just for a different reason, and it changes deletable_ids, so every
    # per-user table (including the deal/platform/campaign/convo sets above,
    # which already only include rows where both sides were in the original
    # deletable_ids) stays consistent: nothing here re-adds a row that was
    # already correctly excluded, it only ever removes users from the final
    # deletable set.
    referenced_ids = set()
    for d in cross_boundary_deals:
        referenced_ids.add(d.business_id)
        referenced_ids.add(d.platform_owner_id)
    for p in cross_boundary_platforms:
        referenced_ids.add(p.owner_id)
    for c in cross_boundary_campaigns:
        referenced_ids.add(c.business_id)
    for c in cross_boundary_convos:
        referenced_ids.add(c.user_lo)
        referenced_ids.add(c.user_hi)
    protected_ids = (referenced_ids & matched_ids) - blocked_ids
    deletable_ids = deletable_ids - protected_ids

    # --- support tickets: delete whole thread only if the ticket owner is deletable ---
    deletable_tickets = (
        db.query(SupportTicket).filter(SupportTicket.user_id.in_(deletable_ids)).all()
        if deletable_ids else []
    )
    deletable_ticket_ids = {t.id for t in deletable_tickets}

    return {
        "matched_users": matched_users,
        "matched_ids": matched_ids,
        "blocked_ids": blocked_ids,
        "protected_ids": protected_ids,
        "deletable_ids": deletable_ids,
        "deletable_deals": deletable_deals,
        "cross_boundary_deals": cross_boundary_deals,
        "deletable_platforms": deletable_platforms,
        "cross_boundary_platforms": cross_boundary_platforms,
        "deletable_campaigns": deletable_campaigns,
        "cross_boundary_campaigns": cross_boundary_campaigns,
        "deletable_convos": deletable_convos,
        "deletable_convo_ids": deletable_convo_ids,
        "cross_boundary_convos": cross_boundary_convos,
        "deletable_tickets": deletable_tickets,
        "deletable_ticket_ids": deletable_ticket_ids,
    }


def print_report(plan):
    mu = plan["matched_users"]
    print(f"\nMatched {len(mu)} account(s):")
    for u in mu:
        if u.id in plan["blocked_ids"]:
            flag = " [BLOCKED - has admin_audit_log history, will be SKIPPED entirely]"
        elif u.id in plan["protected_ids"]:
            flag = " [PROTECTED - referenced by a kept cross-boundary record, will be SKIPPED entirely]"
        else:
            flag = ""
        roles = ",".join(x for x in [
            "business" if u.is_business else None,
            "platform_owner" if u.is_platform_owner else None,
        ] if x) or "no role"
        print(f"  id={u.id:<5} {u.email:<40} {roles}{flag}")

    print(f"\nWill delete {len(plan['deletable_deals'])} deal(s) "
          f"(both parties are test accounts).")
    if plan["cross_boundary_deals"]:
        print(f"  SKIPPING {len(plan['cross_boundary_deals'])} deal(s) — one side is a "
              f"real (non-matching) account, left untouched:")
        for d in plan["cross_boundary_deals"]:
            print(f"    deal id={d.id} business_id={d.business_id} "
                  f"platform_owner_id={d.platform_owner_id}")

    print(f"\nWill delete {len(plan['deletable_platforms'])} platform listing(s).")
    if plan["cross_boundary_platforms"]:
        print(f"  SKIPPING {len(plan['cross_boundary_platforms'])} listing(s) — referenced "
              f"by a deal outside this cleanup, left untouched:")
        for p in plan["cross_boundary_platforms"]:
            print(f"    platform id={p.id} name={p.name!r} owner_id={p.owner_id}")

    print(f"\nWill delete {len(plan['deletable_campaigns'])} campaign(s).")
    if plan["cross_boundary_campaigns"]:
        print(f"  SKIPPING {len(plan['cross_boundary_campaigns'])} campaign(s) — referenced "
              f"by a deal outside this cleanup, left untouched:")
        for c in plan["cross_boundary_campaigns"]:
            print(f"    campaign id={c.id} title={c.title!r} business_id={c.business_id}")

    print(f"\nWill delete {len(plan['deletable_convos'])} conversation(s) and their messages.")
    if plan["cross_boundary_convos"]:
        print(f"  SKIPPING {len(plan['cross_boundary_convos'])} conversation(s) — the other "
              f"participant is a real (non-matching) account, left untouched:")
        for c in plan["cross_boundary_convos"]:
            print(f"    conversation id={c.id} between users {c.user_lo} and {c.user_hi}")

    print(f"\nWill delete {len(plan['deletable_tickets'])} support ticket(s) and their threads.")

    if plan["blocked_ids"]:
        print(f"\n{len(plan['blocked_ids'])} matched account(s) are BLOCKED from deletion "
              f"because they have immutable admin_audit_log history as an actor. Nothing "
              f"belonging to these accounts will be touched in this run:")
        for u in plan["matched_users"]:
            if u.id in plan["blocked_ids"]:
                print(f"    id={u.id} {u.email}")

    if plan["protected_ids"]:
        print(f"\n{len(plan['protected_ids'])} matched account(s) are PROTECTED from deletion "
              f"because a kept cross-boundary record (listed above as SKIPPED) still refers "
              f"to them. Nothing belonging to these accounts will be touched in this run:")
        for u in plan["matched_users"]:
            if u.id in plan["protected_ids"]:
                print(f"    id={u.id} {u.email}")

    n_fully_deleted = len(plan["deletable_ids"])
    print(f"\n{n_fully_deleted} of {len(plan['matched_users'])} matched account(s) will be "
          f"fully deleted, along with everything listed above tied to them "
          f"(connected Stripe accounts, sessions, notifications, profile assets, "
          f"reset/verification tokens, reviews, proofs, verifications, payments, transfers, "
          f"disputes).")


def execute(db, plan):
    deletable_ids = list(plan["deletable_ids"])
    deletable_deal_ids = [d.id for d in plan["deletable_deals"]]
    deletable_platform_ids = [p.id for p in plan["deletable_platforms"]]
    deletable_convo_ids = list(plan["deletable_convo_ids"])
    deletable_ticket_ids = list(plan["deletable_ticket_ids"])

    if not deletable_ids:
        print("Nothing to delete.")
        return

    # Messages + conversations
    db.query(Message).filter(Message.conversation_id.in_(deletable_convo_ids)).delete(
        synchronize_session=False)
    db.query(Conversation).filter(Conversation.id.in_(deletable_convo_ids)).delete(
        synchronize_session=False)

    # Dispute chain
    dispute_ids = [
        row.id for row in db.query(Dispute.id).filter(Dispute.deal_id.in_(deletable_deal_ids))
    ]
    db.query(DisputeEvent).filter(DisputeEvent.dispute_id.in_(dispute_ids)).delete(
        synchronize_session=False)
    db.query(Dispute).filter(Dispute.id.in_(dispute_ids)).delete(synchronize_session=False)

    # Deal-scoped rows
    db.query(Proof).filter(Proof.deal_id.in_(deletable_deal_ids)).delete(synchronize_session=False)
    db.query(Verification).filter(Verification.deal_id.in_(deletable_deal_ids)).delete(
        synchronize_session=False)
    db.query(Review).filter(Review.deal_id.in_(deletable_deal_ids)).delete(
        synchronize_session=False)
    db.query(Payment).filter(Payment.deal_id.in_(deletable_deal_ids)).delete(
        synchronize_session=False)
    db.query(Transfer).filter(Transfer.deal_id.in_(deletable_deal_ids)).delete(
        synchronize_session=False)
    db.query(Deal).filter(Deal.id.in_(deletable_deal_ids)).delete(synchronize_session=False)

    # Platforms / campaigns
    db.query(PlatformMedia).filter(PlatformMedia.platform_id.in_(deletable_platform_ids)).delete(
        synchronize_session=False)
    db.query(Platform).filter(Platform.id.in_(deletable_platform_ids)).delete(
        synchronize_session=False)
    db.query(Campaign).filter(
        Campaign.id.in_([c.id for c in plan["deletable_campaigns"]])
    ).delete(synchronize_session=False)

    # Support tickets
    db.query(SupportTicketEvent).filter(
        SupportTicketEvent.ticket_id.in_(deletable_ticket_ids)
    ).delete(synchronize_session=False)
    db.query(SupportTicket).filter(SupportTicket.id.in_(deletable_ticket_ids)).delete(
        synchronize_session=False)

    # Simple per-user rows
    db.query(Notification).filter(Notification.user_id.in_(deletable_ids)).delete(
        synchronize_session=False)
    db.query(ConnectedAccount).filter(ConnectedAccount.user_id.in_(deletable_ids)).delete(
        synchronize_session=False)
    db.query(Session).filter(Session.user_id.in_(deletable_ids)).delete(
        synchronize_session=False)
    db.query(ProfileAsset).filter(ProfileAsset.user_id.in_(deletable_ids)).delete(
        synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id.in_(deletable_ids)).delete(
        synchronize_session=False)
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id.in_(deletable_ids)
    ).delete(synchronize_session=False)

    # Break the self-referential link before deleting the users themselves.
    db.query(User).filter(User.id.in_(deletable_ids)).update(
        {User.linked_user_id: None}, synchronize_session=False)

    db.query(User).filter(User.id.in_(deletable_ids)).delete(synchronize_session=False)


def main() -> int:
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__)
        return 2
    pattern = args[0]
    confirm = "--confirm" in args[1:]

    if len(pattern) < MIN_PATTERN_LEN or "@" not in pattern:
        print(f"Refusing to run: pattern {pattern!r} must be at least "
              f"{MIN_PATTERN_LEN} characters and contain '@' (safety guard "
              f"against matching too broadly).")
        return 2

    db = SessionLocal()
    try:
        matched = find_matched_users(db, pattern)
        if not matched:
            print(f"No accounts match {pattern!r}. Nothing to do.")
            return 0

        plan = build_plan(db, matched)
        print_report(plan)

        if not confirm:
            print("\nDry run only — nothing was deleted. Re-run with --confirm "
                  "once this looks right.")
            return 0

        phrase = f"DELETE {len(plan['deletable_ids'])} ACCOUNTS"
        print(f"\nThis is irreversible. Type exactly: {phrase}")
        typed = input("> ").strip()
        if typed != phrase:
            print("Confirmation text didn't match — aborted, nothing was deleted.")
            return 1

        try:
            execute(db, plan)
            db.commit()
        except Exception:
            db.rollback()
            print("\nAn error occurred — the whole operation was rolled back. "
                  "Nothing was deleted.")
            raise

        print(f"\nDone. Deleted {len(plan['deletable_ids'])} account(s) and everything "
              f"listed above tied to them.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
