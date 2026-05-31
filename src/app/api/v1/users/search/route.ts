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
import { searchUsers } from "@/lib/services";

// GET /api/v1/users/search?q=query — Search users
export async function GET(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "users:search")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'users:search' permission", 403, rateLimit);
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const result = await searchUsers({ serviceClient, userId: key.user_id }, query, limit);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/users/search", method: "GET", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
