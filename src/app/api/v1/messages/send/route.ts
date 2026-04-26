import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { fireWebhooks } from "@/lib/webhook-delivery";

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
  const { conversation_id, content, message_type, reply_to } = body;

  if (!conversation_id) {
    return apiError("INVALID_REQUEST", "conversation_id is required", 400, rateLimit);
  }

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return apiError("INVALID_REQUEST", "content is required and must be a non-empty string", 400, rateLimit);
  }

  // Verify the user is a member of this conversation
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversation_id)
    .eq("user_id", key.user_id)
    .single();

  if (!membership) {
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/messages/send", method: "POST", statusCode: 403, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
    return apiError("PERMISSION_DENIED", "You are not a member of this conversation", 403, rateLimit);
  }

  const { data: message, error } = await serviceClient
    .from("messages")
    .insert({
      conversation_id,
      sender_id: key.user_id,
      content: content.trim(),
      message_type: message_type || "text",
      reply_to: reply_to || null,
    })
    .select(`*, sender:profiles(id, username, first_name, last_name, avatar_url)`)
    .single();

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/messages/send", method: "POST", statusCode: error ? 500 : 201, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);

  // Fire webhook for message.received
  fireWebhooks(serviceClient, "message.received", conversation_id, key.user_id, {
    conversation_id,
    message_id: message.id,
    sender_id: key.user_id,
    content_preview: message.content?.slice(0, 100),
    message_type: message.message_type,
    created_at: message.created_at,
  });

  return apiSuccess(message, rateLimit, 201);
}
