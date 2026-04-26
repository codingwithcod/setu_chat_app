import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

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

  // Verify membership
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", params.id)
    .eq("user_id", key.user_id)
    .single();

  if (!membership) {
    return apiError("NOT_FOUND", "Conversation not found or you are not a member", 404, rateLimit);
  }

  const searchParams = request.nextUrl.searchParams;
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  let query = serviceClient
    .from("messages")
    .select(`
      *,
      sender:profiles(id, username, first_name, last_name, avatar_url, is_online),
      files:message_files(id, file_url, file_name, file_size, file_type, mime_type, display_order)
    `)
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/messages/list/${params.id}`, method: "GET", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);

  const sorted = (messages || []).reverse();
  const hasMore = messages?.length === limit;
  const nextCursor = messages?.length ? messages[messages.length - 1].created_at : null;

  return apiSuccess({
    messages: sorted,
    has_more: hasMore,
    next_cursor: nextCursor,
  }, rateLimit);
}
