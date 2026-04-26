import { NextRequest } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
  ALL_WEBHOOK_EVENTS,
  type WebhookEvent,
} from "@/lib/api-key-auth";

// GET /api/v1/webhooks — List webhooks
export async function GET(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "webhooks:read")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'webhooks:read' permission", 403, rateLimit);
  }

  const { data: webhooks, error } = await serviceClient
    .from("webhooks")
    .select("id, name, url, events, is_active, last_triggered_at, failure_count, created_at")
    .eq("user_id", key.user_id)
    .order("created_at", { ascending: false });

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/webhooks", method: "GET", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(webhooks, rateLimit);
}

// POST /api/v1/webhooks — Create a webhook
export async function POST(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "webhooks:manage")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'webhooks:manage' permission", 403, rateLimit);
  }

  const body = await request.json();
  const { name, url, events } = body;

  if (!name || typeof name !== "string") {
    return apiError("INVALID_REQUEST", "name is required", 400, rateLimit);
  }

  if (!url || typeof url !== "string") {
    return apiError("INVALID_REQUEST", "url is required", 400, rateLimit);
  }

  try {
    const parsedUrl = new URL(url);
    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      return apiError("INVALID_REQUEST", "URL must use HTTP or HTTPS", 400, rateLimit);
    }
  } catch {
    return apiError("INVALID_REQUEST", "Invalid URL format", 400, rateLimit);
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    return apiError("INVALID_REQUEST", "At least one event must be selected", 400, rateLimit);
  }

  const validEvents = events.filter((e: string) => ALL_WEBHOOK_EVENTS.includes(e as WebhookEvent));
  if (validEvents.length === 0) {
    return apiError("INVALID_REQUEST", "No valid events selected", 400, rateLimit);
  }

  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const { data: webhook, error } = await serviceClient
    .from("webhooks")
    .insert({
      user_id: key.user_id,
      name: name.trim(),
      url: url.trim(),
      secret,
      events: validEvents,
    })
    .select("*")
    .single();

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/webhooks", method: "POST", statusCode: error ? 500 : 201, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(webhook, rateLimit, 201);
}
