"""Configured Stripe client. Import `stripe` from here so the key is always set."""
import stripe

from .config import settings

stripe.api_key = settings.stripe_secret_key
# Pin a recent API version so behaviour is stable across Stripe's rollouts.
stripe.api_version = "2024-06-20"

__all__ = ["stripe"]
