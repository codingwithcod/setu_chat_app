import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { listMessages } from "@/lib/services";

// GET /api/v1/messages/list/[id] — List messages in a conversation (paginated)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "messages:read")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'messages:read' permission", 403, rateLimit);
  }

  const searchParams = request.nextUrl.searchParams;
  const before = searchParams.get("before");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const result = await listMessages(
    { serviceClient, userId: key.user_id },
    { conversation_id: params.id, before, limit }
  );

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/list/${params.id}`, method: "GET", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
