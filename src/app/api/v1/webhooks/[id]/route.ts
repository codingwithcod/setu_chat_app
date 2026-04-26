import { NextRequest } from "next/server";
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

// PATCH /api/v1/webhooks/[id] — Update a webhook
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "webhooks:manage")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'webhooks:manage' permission", 403, rateLimit);
  }

  // Verify ownership
  const { data: existing } = await serviceClient
    .from("webhooks")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", key.user_id)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", "Webhook not found", 404, rateLimit);
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.url !== undefined) updates.url = body.url;
  if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);

  if (body.events !== undefined) {
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return apiError("INVALID_REQUEST", "At least one event is required", 400, rateLimit);
    }
    updates.events = body.events.filter((e: string) => ALL_WEBHOOK_EVENTS.includes(e as WebhookEvent));
  }

  const { data: updated, error } = await serviceClient
    .from("webhooks")
    .update(updates)
    .eq("id", params.id)
    .select("id, name, url, events, is_active, last_triggered_at, failure_count, created_at, updated_at")
    .single();

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/webhooks/${params.id}`, method: "PATCH", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(updated, rateLimit);
}

// DELETE /api/v1/webhooks/[id] — Delete a webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "webhooks:manage")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'webhooks:manage' permission", 403, rateLimit);
  }

  const { error } = await serviceClient
    .from("webhooks")
    .delete()
    .eq("id", params.id)
    .eq("user_id", key.user_id);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/webhooks/${params.id}`, method: "DELETE", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess({ id: params.id, deleted: true }, rateLimit);
}
