import { config } from './config';
import { supabase } from './supabase';

/**
 * Thin client over the Next.js internal API (`/api/*`). Every request carries
 * the Supabase access token as `Authorization: Bearer <token>` — the backend's
 * getAuthUser() reads it from that header (see src/lib/auth/verify-token.ts).
 *
 * getSession() returns the cached session and transparently refreshes it when
 * the access token is near expiry, so callers never deal with token lifecycle.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** JSON body — serialized automatically. Ignored if `form` is set. */
  body?: unknown;
  /** FormData body for file uploads. */
  form?: FormData;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  let body: BodyInit | undefined;

  if (opts.form) {
    body = opts.form; // Let fetch set the multipart boundary.
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body,
    signal: opts.signal,
  });

  // No content.
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = json?.error || json?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  // Web routes wrap payloads as { data } | { message } — unwrap `data` when present.
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

interface JsonEnvelope {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

function safeJson(text: string): JsonEnvelope | null {
  try {
    return JSON.parse(text) as JsonEnvelope;
  } catch {
    return null;
  }
}

async function requestFull<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    signal: opts.signal,
  });
  const text = await res.text();
  const json = text ? safeJson(text) : null;
  if (!res.ok) {
    const message = json?.error || json?.message || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return json as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', signal }),
  /** GET without unwrapping `data` — for endpoints that return a rich envelope
   * (e.g. messages: { data, hasMore, nextCursor, otherReadReceipts }). */
  getFull: <T>(path: string, signal?: AbortSignal) =>
    requestFull<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', form }),
};
