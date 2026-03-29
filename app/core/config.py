"""Application configuration and finance assumptions."""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables when provided."""

    app_name: str = "AI Money Mentor"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    # Finance assumptions
    equity_return_annual: float = 0.12
    debt_return_annual: float = 0.06
    liquid_return_annual: float = 0.04
    inflation_annual: float = 0.05

    # LLM settings (OpenRouter)
    openrouter_api_key: str | None = None
    openrouter_model: str = "openai/gpt-4o-mini"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_site_url: str | None = None
    openrouter_site_name: str = "AI Money Mentor"

    # Auth and persistence
    # Vercel serverless functions have ephemeral filesystems; default to /tmp there.
    database_url: str = "sqlite:////tmp/ai_money_mentor.db" if os.getenv("VERCEL") else "sqlite:///./ai_money_mentor.db"
    jwt_secret_key: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

