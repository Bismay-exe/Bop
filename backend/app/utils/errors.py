"""Standard response envelope + error codes (PRD §21).

Every response — success or failure — uses the same shape:

    { "success": bool, "data": <any|null>, "error": <obj|null> }

This module centralises the error-code table and the helpers/exception so
routers never hand-build envelopes.
"""
from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


# ─── Error code table (PRD §21) ─────────────────────────────────────────────
ERROR_STATUS: dict[str, int] = {
    "SEARCH_FAILED": 500,
    "STREAM_UNAVAILABLE": 404,
    "STREAM_EXTRACTION_FAILED": 500,
    "SONG_NOT_FOUND": 404,
    "AUTH_REQUIRED": 401,
    "AUTH_INVALID": 401,
    "AUTH_FORBIDDEN": 403,
    "RATE_LIMITED": 429,
    "QUOTA_EXCEEDED": 429,
    "UPSTREAM_ERROR": 502,
    "INTERNAL_ERROR": 500,
}


class APIError(Exception):
    """Raise anywhere; the global handler converts it to an envelope."""

    def __init__(self, code: str, message: str, status: int | None = None):
        self.code = code
        self.message = message
        self.status = status or ERROR_STATUS.get(code, 500)
        super().__init__(message)


def success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data, "error": None}


def error_body(code: str, message: str, status: int, request_id: str) -> dict[str, Any]:
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "status": status,
            "requestId": request_id,
        },
    }


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "req_unknown")


def api_error_response(request: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content=error_body(exc.code, exc.message, exc.status, _request_id(request)),
    )


def unhandled_error_response(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=error_body(
            "INTERNAL_ERROR",
            "An unexpected error occurred.",
            500,
            _request_id(request),
        ),
    )
