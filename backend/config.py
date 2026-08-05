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

    # Object storage (Cloudflare R2, S3-compatible). When these are set, ALL
    # uploads go to the bucket and survive redeploys. Unset -> local disk (dev).
    r2_endpoint_url: str = os.environ.get("R2_ENDPOINT_URL", "")
    r2_access_key_id: str = os.environ.get("R2_ACCESS_KEY_ID", "")
    r2_secret_access_key: str = os.environ.get("R2_SECRET_ACCESS_KEY", "")
    r2_bucket: str = os.environ.get("R2_BUCKET", "")
    r2_url_ttl_seconds: int = int(os.environ.get("R2_URL_TTL_SECONDS", "900"))

    # Payout authority: an ADMIN may release payouts up to this net amount
    # (pence). Anything larger requires SUPER_ADMIN approval.
    payout_admin_limit_pence: int = int(os.environ.get("PAYOUT_ADMIN_LIMIT_PENCE", str(50000)))

    # Transactional email (Resend) — real password-reset delivery.
    resend_api_key: str = os.environ.get("RESEND_API_KEY", "")
    mail_from: str = os.environ.get("MAIL_FROM", "PromoSlot <onboarding@resend.dev>")
    # Where Contact Support submissions are alerted to. Overridable so staging
    # doesn't page the real inbox.
    support_email: str = os.environ.get("SUPPORT_EMAIL", "support@usepromoslot.com")

    # Inbound support replies (Resend receiving). A DEDICATED subdomain: the root
    # domain's MX already points at Google Workspace and must not be touched.
    # Outgoing replies set Reply-To: ticket-{id}@<reply_domain>, which is how an
    # inbound message is matched back to its ticket.
    reply_domain: str = os.environ.get("REPLY_DOMAIN", "reply.usepromoslot.com")
    resend_webhook_secret: str = os.environ.get("RESEND_WEBHOOK_SECRET", "")

    @property
    def inbound_configured(self) -> bool:
        return bool(self.resend_webhook_secret and self.reply_domain)

    @property
    def stripe_configured(self) -> bool:
        return self.stripe_secret_key.startswith("sk_")

    @property
    def storage_remote(self) -> bool:
        return bool(self.r2_endpoint_url and self.r2_access_key_id
                    and self.r2_secret_access_key and self.r2_bucket)

    @property
    def email_configured(self) -> bool:
        return self.resend_api_key.startswith("re_")


settings = Settings()
