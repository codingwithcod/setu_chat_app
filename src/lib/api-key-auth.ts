/**
 * Public API key authentication & permission verification.
 *
 * Every /api/v1/* request goes through:
 *   1. Extract Bearer token from Authorization header
 *   2. SHA-256 hash → DB lookup
 *   3. Validate: is_active, expiry, IP whitelist
 *   4. Rate limit check
 *   5. Permission scope check for the requested endpoint
 *   6. Log usage
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders, type RateLimitResult } from "./api-rate-limiter";

// ── Key format ──────────────────────────────────────────────
const KEY_PREFIX = "tap_setu_";
const KEY_RANDOM_BYTES = 32;

/**
 * Generate a new API key.
 * Returns { raw, hash, prefix } — raw is shown once to the user, hash is stored.
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(KEY_RANDOM_BYTES).toString("hex");
  const raw = `${KEY_PREFIX}${randomPart}`;
  const hash = hashKey(raw);
  const prefix = raw.slice(0, KEY_PREFIX.length + 8); // e.g. "tap_setu_a3f8b1c9"
  return { raw, hash, prefix };
}

/**
 * SHA-256 hash a raw key for storage / lookup.
 */
export function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── Permission scopes ───────────────────────────────────────
export const ALL_PERMISSION_SCOPES = [
  "messages:send",
  "messages:read",
  "messages:edit",
  "messages:delete",
  "conversations:create",
  "conversations:read",
  "conversations:update",
  "conversations:delete",
  "members:add",
  "members:remove",
  "members:list",
  "users:search",
  "users:profile",
  "files:upload",
  "files:read",
  "webhooks:manage",
  "webhooks:read",
  "account:read",
] as const;

export type PermissionScope = (typeof ALL_PERMISSION_SCOPES)[number];

/** Preset templates for the UI */
export const PERMISSION_PRESETS: Record<string, { name: string; description: string; scopes: PermissionScope[] }> = {
  read_only: {
    name: "Read Only",
    description: "Read messages, conversations, and user profiles",
    scopes: ["messages:read", "conversations:read", "members:list", "users:profile", "account:read"],
  },
  send_messages: {
    name: "Send Messages",
    description: "Read and send messages, upload files",
    scopes: [
      "messages:send", "messages:read", "conversations:read",
      "members:list", "users:profile", "files:upload", "files:read", "account:read",
    ],
  },
  full_chat: {
    name: "Full Chat Access",
    description: "All messaging, conversation, and member operations",
    scopes: [
      "messages:send", "messages:read", "messages:edit", "messages:delete",
      "conversations:create", "conversations:read", "conversations:update", "conversations:delete",
      "members:add", "members:remove", "members:list",
      "users:search", "users:profile",
      "files:upload", "files:read",
      "account:read",
    ],
  },
  admin: {
    name: "Admin",
    description: "Full access to all API features",
    scopes: [...ALL_PERMISSION_SCOPES],
  },
};

// ── Webhook event types ─────────────────────────────────────
export const ALL_WEBHOOK_EVENTS = [
  "message.received",
  "message.updated",
  "message.deleted",
  "conversation.created",
  "member.joined",
  "member.left",
] as const;

export type WebhookEvent = (typeof ALL_WEBHOOK_EVENTS)[number];

export const WEBHOOK_EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  "message.received": "When a new message is received in any of your conversations",
  "message.updated": "When a message is edited",
  "message.deleted": "When a message is deleted",
  "conversation.created": "When you are added to a new conversation",
  "member.joined": "When a new member joins a group you're in",
  "member.left": "When a member leaves or is removed from a group",
};

// ── Endpoint → required permission mapping ──────────────────
interface EndpointPermission {
  scope: PermissionScope;
}

const ENDPOINT_PERMISSIONS: Record<string, Record<string, EndpointPermission>> = {
  // Messages
  "POST /api/v1/messages/send":      { scope: { scope: "messages:send" } },
  "GET /api/v1/messages":            { scope: { scope: "messages:read" } },
  "PATCH /api/v1/messages":          { scope: { scope: "messages:edit" } },
  "DELETE /api/v1/messages":         { scope: { scope: "messages:delete" } },
  // Conversations
  "GET /api/v1/conversations":       { scope: { scope: "conversations:read" } },
  "POST /api/v1/conversations":      { scope: { scope: "conversations:create" } },
  "PATCH /api/v1/conversations":     { scope: { scope: "conversations:update" } },
  "DELETE /api/v1/conversations":    { scope: { scope: "conversations:delete" } },
  // Groups
  "POST /api/v1/groups":             { scope: { scope: "conversations:create" } },
  "POST /api/v1/groups/members":     { scope: { scope: "members:add" } },
  "DELETE /api/v1/groups/members":   { scope: { scope: "members:remove" } },
  "GET /api/v1/groups/members":      { scope: { scope: "members:list" } },
  // Users
  "GET /api/v1/users/search":        { scope: { scope: "users:search" } },
  "GET /api/v1/users":               { scope: { scope: "users:profile" } },
  // Files
  "POST /api/v1/files/upload":       { scope: { scope: "files:upload" } },
  "GET /api/v1/files":               { scope: { scope: "files:read" } },
  // Account
  "GET /api/v1/account":             { scope: { scope: "account:read" } },
  // Webhooks
  "GET /api/v1/webhooks":            { scope: { scope: "webhooks:read" } },
  "POST /api/v1/webhooks":           { scope: { scope: "webhooks:manage" } },
  "PATCH /api/v1/webhooks":          { scope: { scope: "webhooks:manage" } },
  "DELETE /api/v1/webhooks":         { scope: { scope: "webhooks:manage" } },
};

/**
 * Resolve the required permission scope for a given method + pathname.
 * Returns null if no permission mapping is found (will result in 404).
 */
export function getRequiredScope(method: string, pathname: string): PermissionScope | null {
  // Normalize: strip dynamic IDs (UUIDs) from the path
  const normalized = pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ""
  );

  // Try exact match first
  const key = `${method} ${normalized}`;
  for (const [pattern, perm] of Object.entries(ENDPOINT_PERMISSIONS)) {
    if (key === pattern || key.startsWith(pattern.replace(/\/$/, ""))) {
      return perm.scope.scope;
    }
  }
  return null;
}

/**
 * Check if a key's permissions include the required scope.
 */
export function hasPermission(
  permissions: Record<string, boolean>,
  requiredScope: PermissionScope
): boolean {
  return permissions[requiredScope] === true;
}

// ── API response helpers ────────────────────────────────────

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  permissions: Record<string, boolean>;
  rate_limit_rpm: number;
  allowed_ips: string[];
  allowed_origins: string[];
  expires_at: string | null;
  last_used_at: string | null;
  total_requests: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Build a standardized success response for the public API.
 */
export function apiSuccess<T>(
  data: T,
  rateLimit?: RateLimitResult,
  status = 200
): NextResponse {
  const body = {
    success: true,
    data,
    meta: {
      request_id: `req_${crypto.randomBytes(8).toString("hex")}`,
      ...(rateLimit && {
        rate_limit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
      }),
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rateLimit ? rateLimitHeaders(rateLimit) : {}),
  };

  return NextResponse.json(body, { status, headers });
}

/**
 * Build a standardized error response for the public API.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  rateLimit?: RateLimitResult
): NextResponse {
  const body = {
    success: false,
    error: { code, message, status },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rateLimit ? rateLimitHeaders(rateLimit) : {}),
  };

  return NextResponse.json(body, { status, headers });
}

/**
 * Authenticate an API request using the Bearer token.
 * Returns the API key record if valid, or a NextResponse error.
 */
export async function authenticateApiKey(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseServiceClient: any
): Promise<{ key: ApiKeyRecord; rateLimit: RateLimitResult } | NextResponse> {
  // 1. Extract Bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return apiError(
      "MISSING_API_KEY",
      "Authorization header with Bearer token is required",
      401
    );
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith(KEY_PREFIX)) {
    return apiError(
      "INVALID_API_KEY",
      "API key must start with tap_setu_",
      401
    );
  }

  // 2. Hash and lookup
  const keyHash = hashKey(rawKey);
  const { data: keyRecord, error } = await supabaseServiceClient
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRecord) {
    return apiError("INVALID_API_KEY", "The provided API key is invalid", 401);
  }

  const key = keyRecord as ApiKeyRecord;

  // 3. Check is_active
  if (!key.is_active) {
    return apiError("KEY_DISABLED", "This API key has been deactivated", 403);
  }

  // 4. Check expiry
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return apiError("KEY_EXPIRED", "This API key has expired", 403);
  }

  // 5. IP whitelist check
  if (key.allowed_ips && key.allowed_ips.length > 0) {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!key.allowed_ips.includes(clientIp)) {
      return apiError(
        "IP_NOT_ALLOWED",
        "Your IP address is not in the allowlist for this key",
        403
      );
    }
  }

  // 6. Rate limit
  const rateLimitResult = checkRateLimit(key.id, key.rate_limit_rpm);
  if (!rateLimitResult.allowed) {
    return apiError(
      "RATE_LIMIT_EXCEEDED",
      `Rate limit of ${key.rate_limit_rpm} requests per minute exceeded. Try again in ${rateLimitResult.reset} seconds.`,
      429,
      rateLimitResult
    );
  }

  // 7. Update last_used_at and total_requests (fire-and-forget)
  supabaseServiceClient
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      total_requests: key.total_requests + 1,
    })
    .eq("id", key.id)
    .then(() => {});

  return { key, rateLimit: rateLimitResult };
}

/**
 * Log an API request for usage analytics (fire-and-forget).
 */
export function logApiUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseServiceClient: any,
  params: {
    apiKeyId: string;
    userId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    ipAddress?: string;
    userAgent?: string;
    responseTimeMs?: number;
  }
) {
  supabaseServiceClient
    .from("api_key_usage_logs")
    .insert({
      api_key_id: params.apiKeyId,
      user_id: params.userId,
      endpoint: params.endpoint,
      method: params.method,
      status_code: params.statusCode,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      response_time_ms: params.responseTimeMs || null,
    })
    .then(() => {});
}

/**
 * Generate HMAC-SHA256 signature for webhook payloads.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
}
