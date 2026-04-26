import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

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

  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("id, email, username, first_name, last_name, full_name, avatar_url, is_online, last_seen, developer_plan, created_at")
    .eq("id", key.user_id)
    .single();

  logApiUsage(serviceClient, {
    apiKeyId: key.id,
    userId: key.user_id,
    endpoint: "/api/v1/account",
    method: "GET",
    statusCode: error ? 500 : 200,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent") || undefined,
    responseTimeMs: Date.now() - startTime,
  });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch account", 500, rateLimit);
  }

  return apiSuccess({
    ...profile,
    plan: profile.developer_plan,
  }, rateLimit);
}
