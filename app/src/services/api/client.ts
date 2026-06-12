/**
 * HTTP client for the BOP streaming backend.
 *
 * Follows the same defensive pattern as services/lyrics/fetchLyrics.ts:
 *   - AbortController + timeout
 *   - in-flight request dedupe (per method+url+body)
 *   - unwraps the `{ success, data, error }` envelope, throwing ApiRequestError
 *
 * Phase 1: no auth header (Supabase JWT arrives in Phase 2). The `getToken`
 * seam is already here so Phase 2 only fills it in.
 */
import { ApiEnvelope } from './types';

// EXPO_PUBLIC_* vars are inlined by Expo at build time.
// e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:8000/api/v1
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:8000/api/v1';

// yt-dlp extraction can take 5–12s on cold starts (P4) — generous default,
// with a shorter timeout for lightweight metadata calls.
const DEFAULT_TIMEOUT_MS = 12000;
const STREAM_TIMEOUT_MS = 20000;

export class ApiRequestError extends Error {
  code: string;
  status: number;
  requestId?: string;
  constructor(code: string, message: string, status: number, requestId?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  dedupe?: boolean;
}

// Phase 2: read the Supabase access token from the auth store.
// Lazy require avoids a circular import (authStore → endpoints → client).
async function getToken(): Promise<string | null> {
  try {
    const { getAccessToken } = require('../../store/authStore');
    return await getAccessToken();
  } catch {
    return null;
  }
}

const inFlight = new Map<string, Promise<unknown>>();

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    dedupe = method === 'GET',
  } = options;

  const url = `${BASE_URL}${endpoint}`;
  const dedupeKey = `${method}:${url}:${body ? JSON.stringify(body) : ''}`;

  if (dedupe && inFlight.has(dedupeKey)) {
    return inFlight.get(dedupeKey)! as Promise<T>;
  }

  const run = (async (): Promise<T> => {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onAbort);
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const token = await getToken();
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      let envelope: ApiEnvelope<T>;
      try {
        envelope = (await res.json()) as ApiEnvelope<T>;
      } catch {
        throw new ApiRequestError('INTERNAL_ERROR', `Bad response (${res.status})`, res.status);
      }

      if (!envelope.success || envelope.error) {
        const e = envelope.error;
        throw new ApiRequestError(
          e?.code ?? 'INTERNAL_ERROR',
          e?.message ?? 'Request failed',
          e?.status ?? res.status,
          e?.requestId,
        );
      }
      return envelope.data as T;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  })();

  if (dedupe) {
    inFlight.set(dedupeKey, run);
    run.finally(() => inFlight.delete(dedupeKey)).catch(() => {});
  }

  return run;
}

export const apiConfig = {
  baseUrl: BASE_URL,
  streamTimeoutMs: STREAM_TIMEOUT_MS,
};
