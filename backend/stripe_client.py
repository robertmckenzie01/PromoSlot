"""Configured Stripe clients.

- `stripe` (module): used for v1 objects — PaymentIntents, Transfers, Webhooks.
- `client` (StripeClient): used for v2 objects — Accounts v2 / Connect onboarding.

Both authenticate with the same secret key from .env.
"""
import stripe as stripe
from stripe import StripeClient

from .config import settings

# v1 module client (charges, transfers, webhook signature verification)
stripe.api_key = settings.stripe_secret_key
stripe.api_version = "2024-06-20"

# v2 client (Accounts v2 / Connect). Uses the SDK's default (v2-capable) version.
client = StripeClient(settings.stripe_secret_key)

__all__ = ["stripe", "client"]
