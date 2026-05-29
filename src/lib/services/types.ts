/**
 * Shared service layer types.
 *
 * Service functions hold the business logic for each public API action and are
 * called by BOTH the REST routes (`/api/v1/*`) and the MCP server. They take an
 * already-authenticated context and return a `ServiceResult` — they never deal
 * with HTTP, authentication, rate limiting, or usage logging (those happen once
 * at the entry boundary).
 */

export interface ServiceCtx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any;
  userId: string;
}

export type ServiceResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; code: string; message: string; status: number };

export function ok<T>(data: T, status = 200): ServiceResult<T> {
  return { ok: true, data, status };
}

export function err(code: string, message: string, status: number): ServiceResult<never> {
  return { ok: false, code, message, status };
}
