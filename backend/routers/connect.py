"""Stripe Connect onboarding for platform owners — Accounts v2.

Flow:
  POST /connect/account          create (or reuse) the owner's v2 account
  POST /connect/onboarding-link  get a Stripe-hosted onboarding URL
  GET  /connect/status           live payout-capability status

Money model: separate charges & transfers. The owner's account only needs to
RECEIVE transfers, so we request the recipient `stripe_balance.stripe_transfers`
capability. A payout is only possible once Stripe reports that capability
`active` — we never treat onboarding as complete on our own say-so.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import ConnectedAccount, User
from ..services import onboarding_complete, sync_connected_account, transfers_status_of
from ..stripe_client import client

router = APIRouter(prefix="/connect", tags=["connect"])


@router.get("/return")
def onboarding_return():
    """Browser lands here after the platform owner finishes Stripe onboarding.

    No auth dependency here on purpose — Stripe redirects the raw browser,
    which may not be carrying our session in a way we want to depend on.
    The frontend has no hash-based router, so this just gets the person
    back into the app rather than a bare 404; the dashboard re-checks real
    status via GET /connect/status on load, Stripe is the source of truth.
    """
    return RedirectResponse(url="/")


@router.get("/refresh")
def onboarding_refresh():
    """Browser lands here if the onboarding link expired or was abandoned."""
    return RedirectResponse(url="/")

# v2 account fields to expand on reads.
_INCLUDE = ["configuration.recipient", "requirements", "identity"]


def _require_platform_owner(user: User) -> None:
    if not user.is_platform_owner:
        raise HTTPException(status_code=403,
                            detail="Only platform owners can set up payouts")


def _account_row(db: Session, user: User) -> ConnectedAccount:
    return db.query(ConnectedAccount).filter_by(user_id=user.id).first()


def _stripe_error(e) -> HTTPException:
    msg = getattr(e, "user_message", None) or str(e)
    return HTTPException(status_code=502, detail=f"Stripe error: {msg}")


@router.post("/account")
def create_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create the owner's v2 connected account, or return the existing one."""
    _require_platform_owner(user)

    existing = _account_row(db, user)
    if existing:
        return {"stripe_account_id": existing.stripe_account_id, "reused": True}

    try:
        acct = client.v2.core.accounts.create({
            "contact_email": user.email,
            "display_name": user.display_name or user.email,
            # Stripe-hosted Express dashboard for the platform owner.
            "dashboard": "express",
            "identity": {"country": "GB", "entity_type": "individual"},
            "defaults": {
                "currency": "gbp",
                # Platform (this application) is merchant of record for the charge,
                # so it collects Stripe fees and is liable for losses.
                "responsibilities": {
                    "fees_collector": "application",
                    "losses_collector": "application",
                },
            },
            "configuration": {
                "recipient": {
                    "capabilities": {
                        "stripe_balance": {"stripe_transfers": {"requested": True}},
                    },
                },
            },
            "include": _INCLUDE,
            "metadata": {"promoslot_user_id": str(user.id)},
        })
    except Exception as e:
        raise _stripe_error(e)

    row = ConnectedAccount(user_id=user.id, stripe_account_id=acct.id)
    db.add(row)
    db.commit()
    sync_connected_account(db, acct)
    return {"stripe_account_id": acct.id, "reused": False}


@router.post("/onboarding-link")
def onboarding_link(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a Stripe-hosted onboarding link for the recipient configuration."""
    _require_platform_owner(user)
    row = _account_row(db, user)
    if row is None:
        raise HTTPException(status_code=400, detail="Create a connected account first")

    try:
        link = client.v2.core.account_links.create({
            "account": row.stripe_account_id,
            "use_case": {
                "type": "account_onboarding",
                "account_onboarding": {
                    "configurations": ["recipient"],
                    "refresh_url": f"{settings.app_base_url}/connect/refresh",
                    "return_url": f"{settings.app_base_url}/connect/return",
                },
            },
        })
    except Exception as e:
        raise _stripe_error(e)

    return {"url": link.url}


@router.get("/status")
def connect_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Live payout-capability status straight from Stripe, mirrored to our DB."""
    _require_platform_owner(user)
    row = _account_row(db, user)
    if row is None:
        return {"has_account": False, "onboarding_complete": False}

    try:
        acct = client.v2.core.accounts.retrieve(row.stripe_account_id, {"include": _INCLUDE})
    except Exception as e:
        raise _stripe_error(e)

    row = sync_connected_account(db, acct) or row
    return {
        "has_account": True,
        "stripe_account_id": row.stripe_account_id,
        "transfers_status": transfers_status_of(acct),
        "transfers_active": row.transfers_active,
        "requirements_due": row.requirements_due,
        "onboarding_complete": onboarding_complete(row),
    }
