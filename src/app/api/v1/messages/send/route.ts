import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { sendMessage } from "@/lib/services";

// POST /api/v1/messages/send — Send a message
export async function POST(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "messages:send")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'messages:send' permission", 403, rateLimit);
  }

  const body = await request.json();
  const result = await sendMessage({ serviceClient, userId: key.user_id }, body);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/messages/send", method: "POST", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
