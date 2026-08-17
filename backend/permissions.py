"""Centralised, deny-by-default role-based access control.

Roles live in the database on the user record and are re-read on every request
(see deps.get_current_user) — never trusted from the client. Endpoints declare a
named permission; anything not explicitly granted is denied.

The role tier is a BACKEND PERMISSION CONCEPT ONLY. It is never a public-facing
label on a regular account: a member is represented by what they actually do
(platform-owner listing / business campaign). Only ADMIN and SUPER_ADMIN are ever
surfaced as a role in the UI — "USER" never is.
"""
from fastapi import HTTPException


class Role:
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

    ALL = (USER, ADMIN, SUPER_ADMIN)
    PRIVILEGED = (ADMIN, SUPER_ADMIN)          # roles only a super-admin may assign


class Perm:
    # Delivery review / money movement
    DEAL_VIEW_EVIDENCE = "deal.view_evidence"
    DEAL_VERIFY = "deal.verify"
    DEAL_REJECT = "deal.reject"
    PAYOUT_RELEASE = "payout.release"          # kept separate from verify on purpose
    DISPUTE_MANAGE = "dispute.manage"          # chargeback queue: view, assign, note, request info

    # Admin account management
    ADMIN_VIEW = "admin.view"
    ADMIN_CREATE = "admin.create"
    ADMIN_SUSPEND = "admin.suspend"
    ADMIN_REMOVE = "admin.remove"

    # Member moderation
    USER_SUSPEND = "user.suspend"
    USER_BAN = "user.ban"

    # Listing moderation
    LISTING_REQUEST_CHANGES = "listing.request_changes"
    LISTING_SUSPEND = "listing.suspend"
    LISTING_REMOVE = "listing.remove"

    # Campaign moderation
    CAMPAIGN_REQUEST_CHANGES = "campaign.request_changes"
    CAMPAIGN_SUSPEND = "campaign.suspend"
    CAMPAIGN_REMOVE = "campaign.remove"


# Admins review delivery and release ordinary payouts. Everything that changes
# who holds power, or removes members/content, is super-admin only.
_ADMIN_PERMS = frozenset({
    Perm.DEAL_VIEW_EVIDENCE,
    Perm.DEAL_VERIFY,
    Perm.DEAL_REJECT,
    Perm.PAYOUT_RELEASE,
    Perm.DISPUTE_MANAGE,
})

_SUPER_ADMIN_PERMS = frozenset(_ADMIN_PERMS | {
    Perm.ADMIN_VIEW, Perm.ADMIN_CREATE, Perm.ADMIN_SUSPEND, Perm.ADMIN_REMOVE,
    Perm.USER_SUSPEND, Perm.USER_BAN,
    Perm.LISTING_REQUEST_CHANGES, Perm.LISTING_SUSPEND, Perm.LISTING_REMOVE,
    Perm.CAMPAIGN_REQUEST_CHANGES, Perm.CAMPAIGN_SUSPEND, Perm.CAMPAIGN_REMOVE,
})

ROLE_PERMISSIONS = {
    Role.USER: frozenset(),                    # regular marketplace actions only
    Role.ADMIN: _ADMIN_PERMS,
    Role.SUPER_ADMIN: _SUPER_ADMIN_PERMS,
}


def role_of(user) -> str:
    return getattr(user, "role", None) or Role.USER


def permissions_for(user) -> frozenset:
    if user is None or is_suspended(user):
        return frozenset()                     # suspended accounts hold no power
    return ROLE_PERMISSIONS.get(role_of(user), frozenset())


def is_suspended(user) -> bool:
    return bool(getattr(user, "suspended_at", None))


def has_permission(user, permission: str) -> bool:
    return permission in permissions_for(user)


def require_permission(user, permission: str) -> None:
    """Deny by default. Raises 403 unless the user's DB role grants `permission`."""
    if not has_permission(user, permission):
        raise HTTPException(status_code=403, detail="Forbidden: insufficient permissions")


def is_admin(user) -> bool:
    return role_of(user) in Role.PRIVILEGED and not is_suspended(user)


def is_super_admin(user) -> bool:
    return role_of(user) == Role.SUPER_ADMIN and not is_suspended(user)
