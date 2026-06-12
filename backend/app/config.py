"""Application configuration via pydantic-settings.

Phase 1 only needs the app/yt-dlp/observability fields. Supabase fields are
defined but optional here — they become required in Phase 2 (auth).
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ─── Supabase (Phase 2+) ────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""  # legacy HS256 shared secret (Settings → API → JWT)

    # ─── App ────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:19006"

    # ─── yt-dlp ─────────────────────────────────────────────────────────────
    YTDLP_AUDIO_FORMAT: str = "m4a"
    YTDLP_AUDIO_QUALITY: int = 0
    YTDLP_TIMEOUT_SECONDS: int = 15
    # InnerTube player clients, in fallback order. tv/ios/web_safari bypass the
    # "confirm you're not a bot" challenge on datacenter IPs best WITHOUT a PO
    # token (android/web are challenged most). Tune on Railway via env.
    YTDLP_PLAYER_CLIENTS: str = "tv,ios,web_safari,mweb"
    # Escape hatch when YouTube keeps blocking the host IP: paste the contents of
    # a Netscape cookies.txt (from a logged-in YouTube session) into this env var.
    # When set, it's written to a temp file and passed to yt-dlp as cookiefile.
    YTDLP_COOKIES: str = ""

    # ─── Region ─────────────────────────────────────────────────────────────
    DEFAULT_COUNTRY: str = "IN"

    # ─── Rate limiting (Phase 4) ────────────────────────────────────────────
    STREAM_RATE_LIMIT_PER_MINUTE: int = 30
    STREAM_RATE_LIMIT_IP_PER_MINUTE: int = 60
    SEARCH_RATE_LIMIT_PER_MINUTE: int = 60
    STREAM_DAILY_QUOTA: int = 1000  # per-user/day; 0 disables

    # ─── Observability ──────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"  # json | text

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_SERVICE_ROLE_KEY)

    @property
    def ytdlp_player_clients(self) -> list[str]:
        return [c.strip() for c in self.YTDLP_PLAYER_CLIENTS.split(",") if c.strip()]

    @property
    def jwks_url(self) -> str:
        base = self.SUPABASE_URL.rstrip("/")
        return f"{base}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
