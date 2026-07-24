"""Configured Stripe clients.

- `stripe` (module): used for v1 objects — PaymentIntents, Transfers, Webhooks.
- `client` (StripeClient): used for v2 objects — Accounts v2 / Connect onboarding.

Both authenticate with the same secret key from .env.
"""
import stripe as stripe
from stripe import StripeClient

from .config import settings

# v1 module client (charges, transfers, webhook signature verification).
# Pinned to the API version this SDK release (stripe-python 15.3.x) is built
# for, so the v1 and v2 clients speak the same version and request/response
# shapes match the SDK. Bump this in lockstep when upgrading stripe-python.
stripe.api_key = settings.stripe_secret_key
stripe.api_version = "2026-06-24.dahlia"

# v2 client (Accounts v2 / Connect). Uses the SDK's default (same version).
client = StripeClient(settings.stripe_secret_key)

__all__ = ["stripe", "client"]
