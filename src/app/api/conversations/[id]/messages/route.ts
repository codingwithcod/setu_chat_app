import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";
import { fireWebhooks } from "@/lib/webhook-delivery";

// Get messages for a conversation (paginated)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "50");

  // One RPC returns the fully-enriched message page (sender, reactions, files,
  // reply_message, forwarded_message), the unread count (computed before marking
  // read), and the other members' read receipts — and upserts this user's read
  // receipt as a side effect. Replaces ~6 serial round-trips with one DB call.
  const { data, error } = await serviceClient.rpc("get_conversation_messages", {
    p_conversation_id: params.id,
    p_user_id: auth.userId,
    p_limit: limit,
    p_cursor: cursor,
    p_mark_read: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The RPC returns messages newest-first (matching the old query); the response
  // sends them oldest-first, exactly as before.
  const result = (data ?? {}) as {
    messages?: Array<{ created_at: string }>;
    unread_count?: number;
    other_read_receipts?: unknown[];
  };
  const messages = result.messages ?? [];
  const hasMore = messages.length === limit;
  const nextCursor = messages.length
    ? messages[messages.length - 1].created_at
    : null;

  return NextResponse.json({
    data: [...messages].reverse(),
    hasMore,
    nextCursor,
    unreadCount: Number(result.unread_count ?? 0),
    otherReadReceipts: result.other_read_receipts ?? [],
  });
}

// Send a message
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = { id: auth.userId };

  const body = await request.json();

  // Insert the message
  const { data: message, error } = await serviceClient
    .from("messages")
    .insert({
      conversation_id: params.id,
      sender_id: user.id,
      content: body.content,
      message_type: body.message_type || "text",
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

  // Insert message files if provided
  if (body.files && Array.isArray(body.files) && body.files.length > 0) {
    const fileRows = body.files.map(
      (
        f: {
          url: string;
          name: string;
          size: number;
          file_type: string;
          mime_type: string;
        },
        index: number
      ) => ({
        message_id: message.id,
        file_url: f.url,
        file_name: f.name,
        file_size: f.size,
        file_type: f.file_type,
        mime_type: f.mime_type,
        display_order: index,
      })
    );

    const { data: insertedFiles, error: filesError } = await serviceClient
      .from("message_files")
      .insert(fileRows)
      .select("id, file_url, file_name, file_size, file_type, mime_type, display_order");

    if (filesError) {
      console.error("Message files insert error:", filesError.message);
    }

    // Attach files to the response
    // Fire webhook for message.received
    fireWebhooks(serviceClient, "message.received", params.id, user.id, {
      conversation_id: params.id,
      message_id: message.id,
      sender_id: user.id,
      content_preview: message.content?.slice(0, 100),
      message_type: message.message_type,
      created_at: message.created_at,
    });

    return NextResponse.json(
      { data: { ...message, files: insertedFiles || [] } },
      { status: 201 }
    );
  }

  // Fire webhook for message.received
  fireWebhooks(serviceClient, "message.received", params.id, user.id, {
    conversation_id: params.id,
    message_id: message.id,
    sender_id: user.id,
    content_preview: message.content?.slice(0, 100),
    message_type: message.message_type,
    created_at: message.created_at,
  });

  return NextResponse.json({ data: { ...message, files: [] } }, { status: 201 });
}
