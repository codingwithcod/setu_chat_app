import { fireWebhooks } from "@/lib/webhook-delivery";
import { ServiceCtx, ServiceResult, ok, err } from "./types";

export interface SendMessageParams {
  conversation_id?: string;
  content?: string;
  message_type?: string;
  reply_to?: string | null;
}

export async function sendMessage(
  { serviceClient, userId }: ServiceCtx,
  params: SendMessageParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { conversation_id, content, message_type, reply_to } = params;

  if (!conversation_id) {
    return err("INVALID_REQUEST", "conversation_id is required", 400);
  }
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return err("INVALID_REQUEST", "content is required and must be a non-empty string", 400);
  }

  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversation_id)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return err("PERMISSION_DENIED", "You are not a member of this conversation", 403);
  }

  const { data: message, error } = await serviceClient
    .from("messages")
    .insert({
      conversation_id,
      sender_id: userId,
      content: content.trim(),
      message_type: message_type || "text",
      reply_to: reply_to || null,
    })
    .select(`*, sender:profiles(id, username, first_name, last_name, avatar_url)`)
    .single();

  if (error) return err("INTERNAL_ERROR", error.message, 500);

  fireWebhooks(serviceClient, "message.received", conversation_id, userId, {
    conversation_id,
    message_id: message.id,
    sender_id: userId,
    content_preview: message.content?.slice(0, 100),
    message_type: message.message_type,
    created_at: message.created_at,
  });

  return ok(message, 201);
}

export interface ListMessagesParams {
  conversation_id: string;
  before?: string | null;
  limit?: number;
}

export async function listMessages(
  { serviceClient, userId }: ServiceCtx,
  params: ListMessagesParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { conversation_id } = params;
  const limit = Math.min(params.limit || 50, 100);
  const before = params.before;

  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversation_id)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return err("NOT_FOUND", "Conversation not found or you are not a member", 404);
  }

  let query = serviceClient
    .from("messages")
    .select(`
      *,
      sender:profiles(id, username, first_name, last_name, avatar_url, is_online),
      files:message_files(id, file_url, file_name, file_size, file_type, mime_type, display_order)
    `)
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;

  if (error) return err("INTERNAL_ERROR", error.message, 500);

  const sorted = (messages || []).reverse();
  const hasMore = messages?.length === limit;
  const nextCursor = messages?.length ? messages[messages.length - 1].created_at : null;

  return ok({ messages: sorted, has_more: hasMore, next_cursor: nextCursor });
}

export interface EditMessageParams {
  message_id: string;
  content?: string;
}

export async function editMessage(
  { serviceClient, userId }: ServiceCtx,
  params: EditMessageParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { message_id, content } = params;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return err("INVALID_REQUEST", "content is required", 400);
  }

  const { data: existing } = await serviceClient
    .from("messages")
    .select("id, sender_id")
    .eq("id", message_id)
    .eq("sender_id", userId)
    .single();

  if (!existing) {
    return err("NOT_FOUND", "Message not found or you are not the sender", 404);
  }

  const { data: updated, error } = await serviceClient
    .from("messages")
    .update({ content: content.trim(), is_edited: true })
    .eq("id", message_id)
    .select(`*, sender:profiles(id, username, first_name, last_name, avatar_url)`)
    .single();

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(updated);
}

export async function deleteMessage(
  { serviceClient, userId }: ServiceCtx,
  messageId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: existing } = await serviceClient
    .from("messages")
    .select("id, sender_id")
    .eq("id", messageId)
    .eq("sender_id", userId)
    .single();

  if (!existing) {
    return err("NOT_FOUND", "Message not found or you are not the sender", 404);
  }

  const { error } = await serviceClient
    .from("messages")
    .update({ is_deleted: true, content: "" })
    .eq("id", messageId);

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok({ id: messageId, deleted: true });
}
