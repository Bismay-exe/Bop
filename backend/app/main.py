"""FastAPI application entrypoint — middleware stack, lifespan, routers, /health.

Phase 1: core music endpoints, no auth. All routes mounted under /api/v1.
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.logging import LoggingMiddleware, configure_logging
from app.routers import (
    album,
    artist,
    auth,
    explore,
    library,
    lyrics,
    playlist,
    recommendations,
    search,
    stream,
    user,
)
from app.services import stream_service, ytmusic_service
from app.utils.errors import (
    APIError,
    api_error_response,
    success,
    unhandled_error_response,
)

configure_logging()
log = structlog.get_logger()

_START_TIME = time.time()
API_PREFIX = "/api/v1"
VERSION = "2.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", environment=settings.ENVIRONMENT, version=VERSION)
    # Warm the ytmusic client so the first request isn't slow.
    try:
        ytmusic_service.get_client()
    except Exception as exc:  # noqa: BLE001
        log.warning("ytmusic_warmup_failed", error=str(exc))
    yield
    log.info("shutdown")


app = FastAPI(title="BOP Music Backend", version=VERSION, lifespan=lifespan)

# ─── Middleware (order: CORS outermost, then logging) ───────────────────────
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


# ─── Exception handlers → standard envelope ─────────────────────────────────
@app.exception_handler(APIError)
async def _api_error(request: Request, exc: APIError):
    log.warning(
        "error",
        request_id=getattr(request.state, "request_id", None),
        error_code=exc.code,
        message=exc.message,
    )
    return api_error_response(request, exc)


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    log.error(
        "error",
        request_id=getattr(request.state, "request_id", None),
        error_code="INTERNAL_ERROR",
        exception=str(exc),
    )
    return unhandled_error_response(request, exc)


# ─── Health (PRD §22) ───────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return success(
        {
            "status": "ok",
            "version": VERSION,
            "ytmusicapi": "available" if ytmusic_service.is_available() else "unavailable",
            "ytdlp": "available" if stream_service.is_available() else "unavailable",
            "supabase": "configured" if settings.supabase_configured else "not_configured",
            "uptime_seconds": round(time.time() - _START_TIME),
        }
    )


# ─── Routers ────────────────────────────────────────────────────────────────
for r in (search, stream, explore, recommendations, artist, album, lyrics, auth, user, library, playlist):
    app.include_router(r.router, prefix=API_PREFIX)
