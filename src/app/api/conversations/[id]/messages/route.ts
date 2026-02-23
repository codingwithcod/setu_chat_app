import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get messages for a conversation (paginated)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = supabase
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
        const { data: replyMsg } = await supabase
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

  // Update read receipt
  if (messages && messages.length > 0) {
    await supabase.from("read_receipts").upsert(
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
  });
}

// Send a message
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data: message, error } = await supabase
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: message }, { status: 201 });
}
