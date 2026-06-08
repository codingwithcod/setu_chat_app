import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "./senders";

/**
 * Send background push notifications for a newly-created message to every other
 * member of the conversation. Safe to fire-and-forget: it resolves recipients,
 * builds the title/body (mirroring the in-app notification text), and dispatches
 * web + expo pushes. Foreground/open-app dedup is handled by the service worker
 * and the in-app notification path — this only needs to fan out.
 *
 * Errors are swallowed so a push failure can never break message sending.
 */

interface SenderLike {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}

interface NewMessageLike {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  sender?: SenderLike | null;
}

function previewBody(content: string | null, messageType: string): string {
  if (content && content.trim().length > 0) return content.slice(0, 140);
  if (messageType === "image") return "📷 Sent an image";
  if (messageType === "file") return "📎 Sent a file";
  return "Sent a message";
}

function senderName(sender: SenderLike | null | undefined): string {
  if (!sender) return "Someone";
  const full = `${sender.first_name || ""} ${sender.last_name || ""}`.trim();
  return full || sender.username || "Someone";
}

export async function notifyNewMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  message: NewMessageLike
): Promise<void> {
  try {
    // Other members = everyone in the conversation except the sender.
    const { data: members } = await serviceClient
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", message.conversation_id)
      .neq("user_id", message.sender_id);

    const recipientIds = (members || []).map((m) => m.user_id as string);
    if (recipientIds.length === 0) return;

    // Conversation type/name for the title (group shows "Sender in Group").
    const { data: conversation } = await serviceClient
      .from("conversations")
      .select("type, name")
      .eq("id", message.conversation_id)
      .single();

    if (conversation?.type === "self") return;

    // Sender profile may already be joined on the message; fetch only if not.
    let sender = message.sender ?? null;
    if (!sender) {
      const { data } = await serviceClient
        .from("profiles")
        .select("first_name, last_name, username")
        .eq("id", message.sender_id)
        .single();
      sender = data;
    }

    const name = senderName(sender);
    const title =
      conversation?.type === "group"
        ? `${name} in ${conversation.name || "Group Chat"}`
        : name;

    await sendPushToUsers(serviceClient, recipientIds, {
      title,
      body: previewBody(message.content, message.message_type),
      conversationId: message.conversation_id,
      url: `/chat/${message.conversation_id}`,
    });
  } catch (e) {
    console.error("[push] notifyNewMessage failed:", e);
  }
}
