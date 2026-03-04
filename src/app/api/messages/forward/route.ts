import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Forward a message to multiple conversations and/or users
export async function POST(request: Request) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // For each userId, find or create a private conversation
  for (const targetUserId of userIds) {
    let foundConvId: string | null = null;

    const { data: myMemberships } = await serviceClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myMemberships) {
      for (const membership of myMemberships) {
        const { data: conv } = await serviceClient
          .from("conversations")
          .select("id, type")
          .eq("id", membership.conversation_id)
          .eq("type", "private")
          .single();

        if (conv) {
          const { data: otherMember } = await serviceClient
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .eq("user_id", targetUserId)
            .single();

          if (otherMember) {
            foundConvId = conv.id;
            break;
          }
        }
      }
    }

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

  // Send forwarded message to each conversation
  const results = [];
  const errors = [];
  for (const convId of targetConversationIds) {
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
      errors.push({ convId, error: insertError.message });
    } else if (forwardedMsg) {
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

      results.push(forwardedMsg);
    }
  }

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
