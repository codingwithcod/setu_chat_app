import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { getAccount } from "@/lib/services";

// GET /api/v1/account — Get the authenticated user's account info
export async function GET(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;

  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "account:read")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'account:read' permission", 403, rateLimit);
  }

  const result = await getAccount({ serviceClient, userId: key.user_id });

  logApiUsage(serviceClient, {
    apiKeyId: key.id,
    userId: key.user_id,
    endpoint: "/api/v1/account",
    method: "GET",
    statusCode: result.status,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent") || undefined,
    responseTimeMs: Date.now() - startTime,
  });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
