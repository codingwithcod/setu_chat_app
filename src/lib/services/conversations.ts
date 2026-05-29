import { ServiceCtx, ServiceResult, ok, err } from "./types";

const FULL_CONV_SELECT = `*, members:conversation_members(*, profile:profiles(id, username, first_name, last_name, avatar_url, is_online))`;

export async function listConversations(
  { serviceClient, userId }: ServiceCtx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: memberOf } = await serviceClient
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!memberOf || memberOf.length === 0) {
    return ok([]);
  }

  const conversationIds = memberOf.map((m: { conversation_id: string }) => m.conversation_id);

  const { data: conversations, error } = await serviceClient
    .from("conversations")
    .select(FULL_CONV_SELECT)
    .in("id", conversationIds)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("last_message_at", { ascending: false });

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(conversations);
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

  // For private: return the existing conversation if one already exists
  if (type === "private") {
    const otherUserId = member_ids[0];
    const { data: existingMembers } = await serviceClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);

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
              .select(FULL_CONV_SELECT)
              .eq("id", conv.id)
              .single();

            return ok({ ...fullConv, existing: true });
          }
        }
      }
    }
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
