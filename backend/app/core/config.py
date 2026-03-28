from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    database_url: str = ""
    redis_url: str = ""
    frontend_url: str = "http://localhost:3000"

    # Auth (Clerk)
    clerk_secret_key: str = ""
    clerk_jwks_url: str | None = None
    clerk_issuer: str | None = None

    # AI
    openai_api_key: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"  # fallback model widely available

    # Storage (S3-compatible, e.g., Cloudflare R2)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_bucket_name: str = "airscan-media"
    aws_endpoint_url: str = ""
    aws_region: str = "auto"

    # Paystack
    paystack_secret_key: str = ""
    paystack_public_key: str | None = None

    # Beta / testing mode
    beta_mode: bool = False
    beta_emails: str = ""

    @property
    def beta_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.beta_emails.split(",") if e.strip()]


settings = Settings()  # type: ignore
