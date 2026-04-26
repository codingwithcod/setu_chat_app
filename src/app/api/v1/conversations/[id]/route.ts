import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

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

  // Verify the user is a member of this conversation
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", params.id)
    .eq("user_id", key.user_id)
    .single();

  if (!membership) {
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/conversations/${params.id}`, method: "GET", statusCode: 404, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
    return apiError("NOT_FOUND", "Conversation not found or you are not a member", 404, rateLimit);
  }

  const { data: conversation, error } = await serviceClient
    .from("conversations")
    .select(`*, members:conversation_members(*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online))`)
    .eq("id", params.id)
    .single();

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/conversations/${params.id}`, method: "GET", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(conversation, rateLimit);
}
