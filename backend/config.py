from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
from pathlib import Path

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/diary_db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_db_url(cls, v: str) -> str:
        # Render provides postgres:// or postgresql:// — SQLAlchemy asyncpg needs postgresql+asyncpg://
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    # AI
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GROQ_API_KEY: str = ""
    DEFAULT_AI_PROVIDER: str = "groq"
    CHILD_NAME: str = "아이"

    # Kakao
    KAKAO_JS_KEY: str = ""

    # OneDrive / Microsoft Graph
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_TENANT_ID: str = "common"
    ONEDRIVE_ACCESS_TOKEN: str = ""
    ONEDRIVE_REFRESH_TOKEN: str = ""

    # Storage — 로컬: 상대경로, 서버: 절대경로 or 마운트 경로
    PHOTOS_DIR: str = "./storage/photos"
    PHOTOS_BASE_URL: str = "http://localhost:8000/static/photos"

    # CORS — 쉼표로 구분된 허용 출처 목록
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
