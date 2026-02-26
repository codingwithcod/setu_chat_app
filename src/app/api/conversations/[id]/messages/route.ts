import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Get messages for a conversation (paginated)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = serviceClient
    .from("messages")
    .select(
      `
      *,
      sender:profiles(id, username, first_name, last_name, avatar_url, is_online),
      reactions:message_reactions(id, user_id, reaction)
    `
    )
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get reply messages if any
  const messagesWithReplies = await Promise.all(
    (messages || []).map(async (msg) => {
      if (msg.reply_to) {
        const { data: replyMsg } = await serviceClient
          .from("messages")
          .select(
            `
            id, content, message_type, sender_id,
            sender:profiles(id, username, first_name, last_name, avatar_url)
          `
          )
          .eq("id", msg.reply_to)
          .single();

        return { ...msg, reply_message: replyMsg };
      }
      return msg;
    })
  );

  // Calculate unread count BEFORE updating read receipt (only on initial load)
  let unreadCount = 0;
  if (!cursor && messages && messages.length > 0) {
    const { data: readReceipt } = await serviceClient
      .from("read_receipts")
      .select("last_read_at")
      .eq("conversation_id", params.id)
      .eq("user_id", user.id)
      .single();

    if (readReceipt) {
      const { count } = await serviceClient
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", params.id)
        .gt("created_at", readReceipt.last_read_at)
        .neq("sender_id", user.id);

      unreadCount = count || 0;
    } else {
      // No read receipt = never opened → all messages from others are unread
      const { count } = await serviceClient
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", params.id)
        .neq("sender_id", user.id);

      unreadCount = count || 0;
    }
  }

  // Update read receipt (marks everything as read)
  if (messages && messages.length > 0) {
    await serviceClient.from("read_receipts").upsert(
      {
        conversation_id: params.id,
        user_id: user.id,
        last_read_message_id: messages[0].id,
        last_read_at: new Date().toISOString(),
      },
      {
        onConflict: "conversation_id,user_id",
      }
    );
  }

  const hasMore = messages?.length === limit;
  const nextCursor = messages?.length
    ? messages[messages.length - 1].created_at
    : null;

  return NextResponse.json({
    data: messagesWithReplies?.reverse() || [],
    hasMore,
    nextCursor,
    unreadCount,
  });
}

// Send a message
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data: message, error } = await serviceClient
    .from("messages")
    .insert({
      conversation_id: params.id,
      sender_id: user.id,
      content: body.content,
      message_type: body.message_type || "text",
      file_url: body.file_url || null,
      file_name: body.file_name || null,
      file_size: body.file_size || null,
      reply_to: body.reply_to || null,
      forwarded_from: body.forwarded_from || null,
    })
    .select(
      `
      *,
      sender:profiles(id, username, first_name, last_name, avatar_url, is_online)
    `
    )
    .single();

  if (error) {
    console.error("Message insert error:", error.message, "Body:", JSON.stringify(body));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: message }, { status: 201 });
}
