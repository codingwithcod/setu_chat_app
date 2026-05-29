import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { updateWebhook, deleteWebhook } from "@/lib/services";

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

  const body = await request.json();
  const result = await updateWebhook({ serviceClient, userId: key.user_id }, params.id, body);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/webhooks/${params.id}`, method: "PATCH", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
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

  const result = await deleteWebhook({ serviceClient, userId: key.user_id }, params.id);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/webhooks/${params.id}`, method: "DELETE", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
