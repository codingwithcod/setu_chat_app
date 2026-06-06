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
import { getConversation } from "@/lib/services";

// GET /api/v1/conversations/[id] — Get a single conversation's details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "conversations:read")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'conversations:read' permission", 403, rateLimit);
  }

  const result = await getConversation({ serviceClient, userId: key.user_id }, params.id);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/conversations/${params.id}`, method: "GET", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
