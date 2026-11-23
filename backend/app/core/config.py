from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables (see .env.example)."""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./studymind.db"
    secret_key: str = "change-me"
    access_token_minutes: int = 60 * 24
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    embedding_model: str = "gemini-embedding-001"
    cors_origins: str = "http://localhost:5173"  # comma-separated list
    max_upload_mb: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
