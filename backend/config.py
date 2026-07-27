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
    # Split fee, both calculated on the agreed/listed price:
    #   seller fee (deducted from payout) + buyer protection fee (added at funding)
    seller_fee_percent: int = int(os.environ.get("SELLER_FEE_PERCENT", "10"))
    buyer_fee_percent: int = int(os.environ.get("BUYER_FEE_PERCENT", "5"))
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./promoslot.sqlite3")
    storage_dir: str = os.environ.get("STORAGE_DIR", "./storage")
    max_upload_bytes: int = int(os.environ.get("MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))
    max_video_bytes: int = int(os.environ.get("MAX_VIDEO_BYTES", str(200 * 1024 * 1024)))

    # Transactional email (Resend) — real password-reset delivery.
    resend_api_key: str = os.environ.get("RESEND_API_KEY", "")
    mail_from: str = os.environ.get("MAIL_FROM", "PromoSlot <onboarding@resend.dev>")

    @property
    def stripe_configured(self) -> bool:
        return self.stripe_secret_key.startswith("sk_")

    @property
    def email_configured(self) -> bool:
        return self.resend_api_key.startswith("re_")


settings = Settings()
