"""Application configuration via environment variables. Secure defaults."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://silkweb:silkweb_dev@localhost:5432/silkweb",
        description="Async PostgreSQL connection string",
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection string for caching and rate limiting",
    )

    # Security - NO DEFAULTS for secrets in production
    jwt_secret: str = Field(
        default="CHANGE-ME-IN-PRODUCTION-USE-64-CHAR-RANDOM",
        description="JWT signing secret (min 32 chars)",
    )
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = Field(default=60, ge=5, le=1440)

    api_key_prefix: str = "sw_live_"
    api_key_test_prefix: str = "sw_test_"

    # ElevenLabs TTS
    elevenlabs_api_key: str = Field(
        default="",
        description="ElevenLabs API key for text-to-speech",
    )

    # OAuth
    google_client_id: str = Field(
        default="",
        description="Google OAuth client ID for token verification",
    )
    apple_client_id: str = Field(
        default="",
        description="Apple Sign-In service ID",
    )

    # CORS - locked down by default
    cors_origins: list[str] = Field(
        default=["https://silkweb.io", "http://localhost:8000", "http://localhost:3000"],
        description="Allowed CORS origins",
    )

    # Rate limiting (per API key, per hour)
    rate_limit_discovery: int = Field(default=100, ge=1)
    rate_limit_tasks: int = Field(default=50, ge=1)
    rate_limit_registration: int = Field(default=10, ge=1)

    # Server
    environment: str = Field(default="production", pattern="^(development|staging|production)$")
    log_level: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    debug: bool = False

    # Request limits
    max_request_size_bytes: int = Field(default=1_048_576, description="1MB max request body")
    max_agent_description_length: int = 500
    max_capabilities_per_agent: int = 50

    # Trusted proxies (for X-Forwarded-For)
    trusted_proxies: list[str] = Field(default=["127.0.0.1"])

    # Email (Hostinger SMTP)
    smtp_host: str = Field(default="smtp.hostinger.com", description="SMTP server host")
    smtp_port: int = Field(default=465, description="SMTP port (465 for SSL)")
    smtp_user: str = Field(default="information@silkweb.io", description="SMTP login")
    smtp_password: str = Field(default="", description="SMTP password")
    smtp_from: str = Field(default="information@silkweb.io", description="From address")

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


settings = Settings()
