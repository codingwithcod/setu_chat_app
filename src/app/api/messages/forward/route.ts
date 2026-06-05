import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

// Forward a message to multiple conversations and/or users
export async function POST(request: Request) {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = { id: auth.userId };

  const body = await request.json();
  const {
    messageId,
    conversationIds = [],
    userIds = [],
  } = body as {
    messageId: string;
    conversationIds: string[];
    userIds: string[];
  };

  if (!messageId) {
    return NextResponse.json(
      { error: "messageId is required" },
      { status: 400 }
    );
  }

  if (conversationIds.length === 0 && userIds.length === 0) {
    return NextResponse.json(
      { error: "At least one recipient is required" },
      { status: 400 }
    );
  }

  // Fetch the original message with its files
  const { data: originalMessage, error: msgError } = await serviceClient
    .from("messages")
    .select("*, files:message_files(id, file_url, file_name, file_size, file_type, mime_type, display_order)")
    .eq("id", messageId)
    .single();

  if (msgError || !originalMessage) {
    return NextResponse.json(
      { error: "Message not found" },
      { status: 404 }
    );
  }

  // Collect all target conversation IDs
  const targetConversationIds = [...conversationIds];

  // Resolve each target user to a private conversation. Previously this ran
  // O(users × memberships) queries (re-fetching memberships per user and
  // probing each one). Instead, look up existing private conversations in a
  // few batched queries and build a userId -> conversationId map up front.
  const existingConvByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: myMemberships } = await serviceClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    const myConvIds = (myMemberships || []).map((m) => m.conversation_id);

    if (myConvIds.length > 0) {
      // Which of my conversations are private?
      const { data: privateConvs } = await serviceClient
        .from("conversations")
        .select("id")
        .in("id", myConvIds)
        .eq("type", "private");

      const myPrivateConvIds = (privateConvs || []).map((c) => c.id);

      if (myPrivateConvIds.length > 0) {
        // Of those, which contain each target user? First match wins (mirrors
        // the original break-on-first-found behavior).
        const { data: targetMemberships } = await serviceClient
          .from("conversation_members")
          .select("conversation_id, user_id")
          .in("conversation_id", myPrivateConvIds)
          .in("user_id", userIds);

        for (const m of targetMemberships || []) {
          if (!existingConvByUser.has(m.user_id)) {
            existingConvByUser.set(m.user_id, m.conversation_id);
          }
        }
      }
    }
  }

  // For each userId, use the existing private conversation or create one.
  for (const targetUserId of userIds) {
    let foundConvId: string | null =
      existingConvByUser.get(targetUserId) ?? null;

    if (!foundConvId) {
      const { data: newConv, error: convError } = await serviceClient
        .from("conversations")
        .insert({
          type: "private",
          created_by: user.id,
        })
        .select()
        .single();

      if (convError || !newConv) {
        continue;
      }

      const { error: membersError } = await serviceClient.from("conversation_members").insert([
        { conversation_id: newConv.id, user_id: user.id, role: "member" },
        { conversation_id: newConv.id, user_id: targetUserId, role: "member" },
      ]);

      if (membersError) {
        continue;
      }

      foundConvId = newConv.id;
    }

    if (foundConvId) {
      targetConversationIds.push(foundConvId);
    }
  }

  // Send the forwarded message to each conversation in parallel. Each
  // conversation's insert -> files -> last_message_at stays ordered within
  // itself, but conversations no longer block one another.
  const settled = await Promise.all(
    targetConversationIds.map(async (convId) => {
      const insertData: Record<string, unknown> = {
        conversation_id: convId,
        sender_id: user.id,
        content: originalMessage.content,
        message_type: originalMessage.message_type || "text",
        forwarded_from: originalMessage.id,
      };

      const { data: forwardedMsg, error: insertError } = await serviceClient
        .from("messages")
        .insert(insertData)
        .select(
          `
          *,
          sender:profiles(id, username, first_name, last_name, avatar_url, is_online)
        `
        )
        .single();

      if (insertError) {
        return { type: "error" as const, convId, error: insertError.message };
      }
      if (!forwardedMsg) {
        // No error but no row — skip silently, matching the original behavior.
        return { type: "skip" as const };
      }

      // Copy files from original message to forwarded message
      const originalFiles = originalMessage.files || [];
      if (originalFiles.length > 0) {
        const fileRows = originalFiles.map((f: { file_url: string; file_name: string; file_size: number; file_type: string; mime_type: string; display_order: number }) => ({
          message_id: forwardedMsg.id,
          file_url: f.file_url,
          file_name: f.file_name,
          file_size: f.file_size,
          file_type: f.file_type,
          mime_type: f.mime_type,
          display_order: f.display_order,
        }));

        await serviceClient.from("message_files").insert(fileRows);
      }

      // Update conversation's last_message_at
      await serviceClient
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);

      return { type: "ok" as const, msg: forwardedMsg };
    })
  );

  const results = settled.flatMap((s) => (s.type === "ok" ? [s.msg] : []));
  const errors = settled.flatMap((s) =>
    s.type === "error" ? [{ convId: s.convId, error: s.error }] : []
  );

  if (results.length === 0 && errors.length > 0) {
    return NextResponse.json(
      { error: "Failed to forward message", details: errors },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: results,
    forwardedCount: results.length,
    message: `Message forwarded to ${results.length} conversation(s)`,
  });
}
