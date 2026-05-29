import { ServiceCtx, ServiceResult, ok, err } from "./types";

export async function addMembers(
  { serviceClient, userId }: ServiceCtx,
  groupId: string,
  userIds: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", groupId)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return err("NOT_FOUND", "Group not found or you are not a member", 404);
  }

  const { data: conv } = await serviceClient
    .from("conversations")
    .select("type")
    .eq("id", groupId)
    .single();

  if (!conv || conv.type !== "group") {
    return err("INVALID_REQUEST", "This endpoint is only for group conversations", 400);
  }

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return err("INVALID_REQUEST", "user_ids array is required", 400);
  }

  const members = userIds.map((id: string) => ({
    conversation_id: groupId,
    user_id: id,
    role: "member",
  }));

  const { error } = await serviceClient
    .from("conversation_members")
    .upsert(members, { onConflict: "conversation_id,user_id" });

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok({ added: userIds.length });
}

export async function listMembers(
  { serviceClient, userId }: ServiceCtx,
  groupId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", groupId)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return err("NOT_FOUND", "Group not found or you are not a member", 404);
  }

  const { data: members, error } = await serviceClient
    .from("conversation_members")
    .select(`*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online)`)
    .eq("conversation_id", groupId);

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(members);
}

export async function removeMember(
  { serviceClient, userId }: ServiceCtx,
  groupId: string,
  targetUserId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  if (!targetUserId) {
    return err("INVALID_REQUEST", "user_id is required", 400);
  }

  const { data: callerMembership } = await serviceClient
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", groupId)
    .eq("user_id", userId)
    .single();

  if (!callerMembership) {
    return err("NOT_FOUND", "Group not found or you are not a member", 404);
  }

  if (targetUserId !== userId && !["admin", "owner"].includes(callerMembership.role)) {
    return err("PERMISSION_DENIED", "Only admins and owners can remove other members", 403);
  }

  const { error } = await serviceClient
    .from("conversation_members")
    .delete()
    .eq("conversation_id", groupId)
    .eq("user_id", targetUserId);

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok({ removed: targetUserId });
}
