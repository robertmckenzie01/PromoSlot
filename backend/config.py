"""Central config. All secrets come from .env (never hard-coded, never committed)."""
import os
from dotenv import load_dotenv

# Load .env from the project root (cwd when running `uvicorn backend.main:app`).
# override=False so real environment variables win over the file in deployment.
load_dotenv(override=False)


class Settings:
    # Stripe
    stripe_secret_key: str = os.environ.get("STRIPE_SECRET_KEY", "")
    stripe_publishable_key: str = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
    stripe_webhook_secret: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

    # App
    app_base_url: str = os.environ.get("APP_BASE_URL", "http://localhost:8000")
    platform_fee_percent: int = int(os.environ.get("PLATFORM_FEE_PERCENT", "20"))
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./promoslot.sqlite3")

    @property
    def stripe_configured(self) -> bool:
        return self.stripe_secret_key.startswith("sk_")


settings = Settings()
