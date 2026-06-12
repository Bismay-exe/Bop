"""Structured logging + request-ID middleware (PRD §22).

P9 note: we log one line per request and one per response with timing — but
NOT request/response bodies. `text` renderer in dev, `json` in prod. Log
sampling / rotation / external sink are deferred (seam only).
"""
from __future__ import annotations

import logging
import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import settings


def configure_logging() -> None:
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(format="%(message)s", level=log_level)

    renderer = (
        structlog.processors.JSONRenderer()
        if settings.LOG_FORMAT.lower() == "json"
        else structlog.dev.ConsoleRenderer()
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


log = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = f"req_{uuid.uuid4().hex[:8]}"
        request.state.request_id = request_id

        ip = request.client.host if request.client else None
        log.info(
            "request",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            ip=ip,
        )

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000)
            log.error(
                "request_failed",
                request_id=request_id,
                path=request.url.path,
                duration_ms=duration_ms,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000)
        log.info(
            "response",
            request_id=request_id,
            status_code=response.status_code,
            duration_ms=duration_ms,
            path=request.url.path,
        )
        response.headers["X-Request-ID"] = request_id
        return response
