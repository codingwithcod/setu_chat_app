import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

// POST /api/v1/groups/[id]/members — Add members to a group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "members:add")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'members:add' permission", 403, rateLimit);
  }

  // Verify user is a member of this group
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", params.id)
    .eq("user_id", key.user_id)
    .single();

  if (!membership) {
    return apiError("NOT_FOUND", "Group not found or you are not a member", 404, rateLimit);
  }

  // Verify it's a group
  const { data: conv } = await serviceClient
    .from("conversations")
    .select("type")
    .eq("id", params.id)
    .single();

  if (!conv || conv.type !== "group") {
    return apiError("INVALID_REQUEST", "This endpoint is only for group conversations", 400, rateLimit);
  }

  const body = await request.json();
  const { user_ids } = body;

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return apiError("INVALID_REQUEST", "user_ids array is required", 400, rateLimit);
  }

  const members = user_ids.map((userId: string) => ({
    conversation_id: params.id,
    user_id: userId,
    role: "member",
  }));

  const { error } = await serviceClient
    .from("conversation_members")
    .upsert(members, { onConflict: "conversation_id,user_id" });

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/groups/${params.id}/members`, method: "POST", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess({ added: user_ids.length }, rateLimit);
}

// GET /api/v1/groups/[id]/members — List group members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "members:list")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'members:list' permission", 403, rateLimit);
  }

  // Verify membership
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", params.id)
    .eq("user_id", key.user_id)
    .single();

  if (!membership) {
    return apiError("NOT_FOUND", "Group not found or you are not a member", 404, rateLimit);
  }

  const { data: members, error } = await serviceClient
    .from("conversation_members")
    .select(`*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online)`)
    .eq("conversation_id", params.id);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/groups/${params.id}/members`, method: "GET", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess(members, rateLimit);
}

// DELETE /api/v1/groups/[id]/members — Remove a member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "members:remove")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'members:remove' permission", 403, rateLimit);
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("user_id");

  if (!userId) {
    return apiError("INVALID_REQUEST", "user_id query parameter is required", 400, rateLimit);
  }

  // Verify the caller is a member with appropriate role
  const { data: callerMembership } = await serviceClient
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", params.id)
    .eq("user_id", key.user_id)
    .single();

  if (!callerMembership) {
    return apiError("NOT_FOUND", "Group not found or you are not a member", 404, rateLimit);
  }

  // Allow removing self, or admin/owner removing others
  if (userId !== key.user_id && !["admin", "owner"].includes(callerMembership.role)) {
    return apiError("PERMISSION_DENIED", "Only admins and owners can remove other members", 403, rateLimit);
  }

  const { error } = await serviceClient
    .from("conversation_members")
    .delete()
    .eq("conversation_id", params.id)
    .eq("user_id", userId);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/groups/${params.id}/members`, method: "DELETE", statusCode: error ? 500 : 200, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  if (error) return apiError("INTERNAL_ERROR", error.message, 500, rateLimit);
  return apiSuccess({ removed: userId }, rateLimit);
}
