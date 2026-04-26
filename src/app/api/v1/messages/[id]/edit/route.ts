import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

// PATCH /api/v1/messages/[id]/edit — Edit a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "messages:edit")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'messages:edit' permission", 403, rateLimit);
  }

  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return apiError("INVALID_REQUEST", "content is required", 400, rateLimit);
  }

  // Verify ownership
  const { data: existing } = await serviceClient
    .from("messages")
    .select("id, sender_id")
    .eq("id", params.id)
    .eq("sender_id", key.user_id)
    .single();

  if (!existing) {
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/${params.id}/edit`, method: "PATCH", statusCode: 404, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
    return apiError("NOT_FOUND", "Message not found or you are not the sender", 404, rateLimit);
  }

  const { data: updated, error } = await serviceClient
    .from("messages")
    .update({ content: content.trim(), is_edited: true })
    .eq("id", params.id)
    .select(`*, sender:profiles(id, username, first_name, last_name, avatar_url)`)
    .single();

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/${params.id}/edit`, method: "PATCH", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(updated, rateLimit);
}

// DELETE /api/v1/messages/[id]/edit — Soft-delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "messages:delete")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'messages:delete' permission", 403, rateLimit);
  }

  // Verify ownership
  const { data: existing } = await serviceClient
    .from("messages")
    .select("id, sender_id")
    .eq("id", params.id)
    .eq("sender_id", key.user_id)
    .single();

  if (!existing) {
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/${params.id}`, method: "DELETE", statusCode: 404, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
    return apiError("NOT_FOUND", "Message not found or you are not the sender", 404, rateLimit);
  }

  const { error } = await serviceClient
    .from("messages")
    .update({ is_deleted: true, content: "" })
    .eq("id", params.id);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/${params.id}`, method: "DELETE", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess({ id: params.id, deleted: true }, rateLimit);
}
