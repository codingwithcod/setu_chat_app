import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { editMessage, deleteMessage } from "@/lib/services";

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

  let body;
  try {
    body = await request.json();
  } catch {
    const msg = "Invalid JSON in request body";
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/${params.id}/edit`, method: "PATCH", statusCode: 400, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: msg });
    return apiError("INVALID_JSON", msg, 400, rateLimit);
  }

  const result = await editMessage(
    { serviceClient, userId: key.user_id },
    { message_id: params.id, content: body.content }
  );

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/${params.id}/edit`, method: "PATCH", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
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

  const result = await deleteMessage({ serviceClient, userId: key.user_id }, params.id);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/${params.id}`, method: "DELETE", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
