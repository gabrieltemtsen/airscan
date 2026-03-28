from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Core
    database_url: str
    redis_url: str
    frontend_url: str = "http://localhost:3000"

    # Auth (Clerk)
    clerk_secret_key: str
    clerk_jwks_url: str | None = None
    clerk_issuer: str | None = None

    # AI
    openai_api_key: str
    gemini_api_key: str

    # Storage (S3-compatible, e.g., Cloudflare R2)
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_bucket_name: str
    aws_endpoint_url: str
    aws_region: str = "auto"

    # Paystack
    paystack_secret_key: str = ""
    paystack_public_key: str | None = None

    # Beta / testing mode
    # Set BETA_MODE=true to bypass ALL billing/usage gates.
    # Testers get unlimited analyses with no payment required.
    beta_mode: bool = False

    # Comma-separated list of emails to auto-grant beta plan on first login.
    # e.g. BETA_EMAILS=tester1@example.com,tester2@example.com
    beta_emails: str = ""

    @property
    def beta_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.beta_emails.split(",") if e.strip()]


settings = Settings()  # type: ignore
