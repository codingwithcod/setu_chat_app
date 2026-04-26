import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

// GET /api/v1/users/[id] — Get a user's public profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "users:profile")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'users:profile' permission", 403, rateLimit);
  }

  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("id, username, first_name, last_name, full_name, avatar_url, is_online, last_seen, created_at")
    .eq("id", params.id)
    .single();

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/users/${params.id}`, method: "GET", statusCode: error ? 404 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error || !profile) return apiError("NOT_FOUND", "User not found", 404, rateLimit);
  return apiSuccess(profile, rateLimit);
}
