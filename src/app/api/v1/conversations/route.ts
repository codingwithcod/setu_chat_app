import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

// GET /api/v1/conversations — List all conversations for the API key owner
export async function GET(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "conversations:read")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'conversations:read' permission", 403, rateLimit);
  }

  // Get conversation IDs the user belongs to
  const { data: memberOf } = await serviceClient
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", key.user_id);

  if (!memberOf || memberOf.length === 0) {
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/conversations", method: "GET", statusCode: 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
    return apiSuccess([], rateLimit);
  }

  const conversationIds = memberOf.map((m) => m.conversation_id);

  const { data: conversations, error } = await serviceClient
    .from("conversations")
    .select(`*, members:conversation_members(*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online))`)
    .in("id", conversationIds)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("last_message_at", { ascending: false });

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/conversations", method: "GET", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(conversations, rateLimit);
}

// POST /api/v1/conversations — Create a new conversation
export async function POST(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "conversations:create")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'conversations:create' permission", 403, rateLimit);
  }

  const body = await request.json();
  const { type, name, description, member_ids } = body;

  if (!type || !["private", "group"].includes(type)) {
    return apiError("INVALID_REQUEST", "type must be 'private' or 'group'", 400, rateLimit);
  }

  if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
    return apiError("INVALID_REQUEST", "member_ids array is required", 400, rateLimit);
  }

  if (type === "private" && member_ids.length !== 1) {
    return apiError("INVALID_REQUEST", "Private chat requires exactly one member_id", 400, rateLimit);
  }

  if (type === "group" && !name) {
    return apiError("INVALID_REQUEST", "Group name is required", 400, rateLimit);
  }

  // For private: check if conversation already exists
  if (type === "private") {
    const otherUserId = member_ids[0];
    const { data: existingMembers } = await serviceClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", key.user_id);

    if (existingMembers) {
      for (const member of existingMembers) {
        const { data: conv } = await serviceClient
          .from("conversations")
          .select("id, type")
          .eq("id", member.conversation_id)
          .eq("type", "private")
          .single();

        if (conv) {
          const { data: otherMember } = await serviceClient
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .eq("user_id", otherUserId)
            .single();

          if (otherMember) {
            const { data: fullConv } = await serviceClient
              .from("conversations")
              .select(`*, members:conversation_members(*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online))`)
              .eq("id", conv.id)
              .single();

            logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/conversations", method: "POST", statusCode: 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
            return apiSuccess({ ...fullConv, existing: true }, rateLimit);
          }
        }
      }
    }
  }

  // Create conversation
  const { data: conversation, error: convError } = await serviceClient
    .from("conversations")
    .insert({
      type,
      name: type === "group" ? name : null,
      description: type === "group" ? description : null,
      created_by: key.user_id,
    })
    .select()
    .single();

  if (convError) {
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/conversations", method: "POST", statusCode: 500, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
    return apiError("INTERNAL_ERROR", convError.message, 500, rateLimit);
  }

  // Add members
  const members = [
    { conversation_id: conversation.id, user_id: key.user_id, role: type === "group" ? "owner" : "member" },
    ...member_ids.map((memberId: string) => ({ conversation_id: conversation.id, user_id: memberId, role: "member" })),
  ];

  await serviceClient.from("conversation_members").insert(members);

  const { data: fullConv } = await serviceClient
    .from("conversations")
    .select(`*, members:conversation_members(*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online))`)
    .eq("id", conversation.id)
    .single();

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/conversations", method: "POST", statusCode: 201, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
  return apiSuccess(fullConv, rateLimit, 201);
}
