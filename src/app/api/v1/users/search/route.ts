import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

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
  const query = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (!query || query.length < 2) {
    return apiError("INVALID_REQUEST", "Search query 'q' must be at least 2 characters", 400, rateLimit);
  }

  const { data: users, error } = await serviceClient
    .from("profiles")
    .select("id, username, first_name, last_name, full_name, avatar_url, is_online")
    .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,full_name.ilike.%${query}%`)
    .neq("id", key.user_id)
    .limit(limit);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/users/search", method: "GET", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(users, rateLimit);
}
