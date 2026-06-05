import { ServiceCtx, ServiceResult, ok, err } from "./types";

const FULL_CONV_SELECT = `*, members:conversation_members(*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online))`;

export async function listConversations(
  { serviceClient, userId }: ServiceCtx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  // One RPC returns the user's (non-deleted) conversations with members +
  // profiles, ordered by last_message_at desc — replacing the previous two-query
  // lookup (member ids → conversations). Same filter/order/shape; member
  // profiles additionally include last_seen.
  const { data: conversations, error } = await serviceClient.rpc(
    "get_user_conversations",
    { p_user_id: userId }
  );

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(conversations || []);
}

export async function getConversation(
  { serviceClient, userId }: ServiceCtx,
  conversationId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return err("NOT_FOUND", "Conversation not found or you are not a member", 404);
  }

  const { data: conversation, error } = await serviceClient
    .from("conversations")
    .select(FULL_CONV_SELECT)
    .eq("id", conversationId)
    .single();

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(conversation);
}

export interface CreateConversationParams {
  type?: string;
  name?: string;
  description?: string;
  member_ids?: string[];
}

export async function createConversation(
  { serviceClient, userId }: ServiceCtx,
  params: CreateConversationParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { type, name, description, member_ids } = params;

  if (!type || !["private", "group"].includes(type)) {
    return err("INVALID_REQUEST", "type must be 'private' or 'group'", 400);
  }
  if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
    return err("INVALID_REQUEST", "member_ids array is required", 400);
  }
  if (type === "private" && member_ids.length !== 1) {
    return err("INVALID_REQUEST", "Private chat requires exactly one member_id", 400);
  }
  if (type === "group" && !name) {
    return err("INVALID_REQUEST", "Group name is required", 400);
  }

  // For private: get-or-create in ONE call. Replaces the old N+1 (a loop over
  // every conversation the user belonged to, probing each one) — finds the
  // existing DM between the two users or creates it, returning the full
  // conversation in the same shape. Existing → existing:true; new → 201.
  if (type === "private") {
    const otherUserId = member_ids[0];
    const { data: result, error: rpcError } = await serviceClient.rpc(
      "get_or_create_private_conversation",
      { p_user_id: userId, p_other_user_id: otherUserId }
    );

    if (rpcError) return err("INTERNAL_ERROR", rpcError.message, 500);

    const { conversation, existing } = (result ?? {}) as {
      conversation?: Record<string, unknown>;
      existing?: boolean;
    };

    if (existing) return ok({ ...conversation, existing: true });
    return ok(conversation, 201);
  }

  const { data: conversation, error: convError } = await serviceClient
    .from("conversations")
    .insert({
      type,
      name: type === "group" ? name : null,
      description: type === "group" ? description : null,
      created_by: userId,
    })
    .select()
    .single();

  if (convError) return err("INTERNAL_ERROR", convError.message, 500);

  const members = [
    { conversation_id: conversation.id, user_id: userId, role: type === "group" ? "owner" : "member" },
    ...member_ids.map((memberId: string) => ({ conversation_id: conversation.id, user_id: memberId, role: "member" })),
  ];

  await serviceClient.from("conversation_members").insert(members);

  const { data: fullConv } = await serviceClient
    .from("conversations")
    .select(FULL_CONV_SELECT)
    .eq("id", conversation.id)
    .single();

  return ok(fullConv, 201);
}
