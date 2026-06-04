import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Get all conversations for the current user
export async function GET() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get conversation IDs the user is a member of
  // Use service client to bypass RLS recursive policy on conversation_members
  const { data: memberOf } = await serviceClient
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (!memberOf || memberOf.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const conversationIds = memberOf.map((m) => m.conversation_id);

  // Get conversations with members and last message
  const { data: conversations, error } = await serviceClient
    .from("conversations")
    .select(
      `
      *,
      members:conversation_members(
        *,
        profile:profiles(id, username, first_name, last_name, avatar_url, is_online)
      )
    `
    )
    .in("id", conversationIds)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("last_message_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get last message + unread count for every conversation in ONE call.
  // Previously this ran 3 queries PER conversation (an N+1). The RPC batches
  // them; if it isn't present yet we fall back to the original per-conversation
  // logic so behavior is identical either way.
  const { data: previews, error: previewError } = await serviceClient.rpc(
    "get_conversation_previews",
    { p_user_id: user.id, p_conversation_ids: conversationIds }
  );

  let conversationsWithLastMessage;
  if (!previewError && previews) {
    const previewMap = new Map(
      (
        previews as Array<{
          conversation_id: string;
          last_message: unknown;
          unread_count: number;
        }>
      ).map((p) => [p.conversation_id, p])
    );
    conversationsWithLastMessage = (conversations || []).map((conv) => {
      const pv = previewMap.get(conv.id);
      return {
        ...conv,
        last_message: pv?.last_message ?? null,
        unread_count: Number(pv?.unread_count ?? 0),
      };
    });
  } else {
    // Fallback: original per-conversation queries (unchanged behavior).
    conversationsWithLastMessage = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: messages } = await serviceClient
          .from("messages")
          .select(
            `
            *,
            sender:profiles(id, username, first_name, last_name, avatar_url)
          `
          )
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // Get unread count
        const { data: readReceipt } = await serviceClient
          .from("read_receipts")
          .select("last_read_at")
          .eq("conversation_id", conv.id)
          .eq("user_id", user.id)
          .single();

        let unreadCount = 0;
        if (readReceipt) {
          const { count } = await serviceClient
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .gt("created_at", readReceipt.last_read_at)
            .neq("sender_id", user.id);

          unreadCount = count || 0;
        } else {
          // No read receipt = user has never opened this conversation
          // Count ALL messages from other users as unread
          const { count } = await serviceClient
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id);

          unreadCount = count || 0;
        }

        return {
          ...conv,
          last_message: messages?.[0] || null,
          unread_count: unreadCount,
        };
      })
    );
  }

  return NextResponse.json({ data: conversationsWithLastMessage });
}

// Create a new conversation (private or group)
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
  const { type, name, description, memberIds } = body;

  if (type === "private") {
    if (!memberIds || memberIds.length !== 1) {
      return NextResponse.json(
        { error: "Private chat requires exactly one other member" },
        { status: 400 }
      );
    }

    const otherUserId = memberIds[0];

    // Check if private conversation already exists
    // Use service client to bypass RLS recursive policy on conversation_members
    const { data: existingMembers } = await serviceClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

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
            // Return existing conversation
            const { data: fullConv } = await serviceClient
              .from("conversations")
              .select(
                `
                *,
                members:conversation_members(
                  *,
                  profile:profiles(id, username, first_name, last_name, avatar_url, is_online)
                )
              `
              )
              .eq("id", conv.id)
              .single();

            return NextResponse.json({ data: fullConv, existing: true });
          }
        }
      }
    }
  }

  // Create conversation
  const { data: conversation, error: convError } = await serviceClient
    .from("conversations")
    .insert({
      type: type || "private",
      name: type === "group" ? name : null,
      description: type === "group" ? description : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (convError) {
    console.error("[API POST /api/conversations] Failed to create conversation:", convError.message);
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  // Add members
  const members = [
    {
      conversation_id: conversation.id,
      user_id: user.id,
      role: type === "group" ? "owner" : "member",
    },
    ...memberIds.map((memberId: string) => ({
      conversation_id: conversation.id,
      user_id: memberId,
      role: "member",
    })),
  ];

  const { error: membersError } = await serviceClient
    .from("conversation_members")
    .insert(members);

  if (membersError) {
    console.error("[API POST /api/conversations] Failed to insert members:", membersError.message);
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  // Return full conversation
  const { data: fullConv } = await serviceClient
    .from("conversations")
    .select(
      `
      *,
      members:conversation_members(
        *,
        profile:profiles(id, username, first_name, last_name, avatar_url, is_online)
      )
    `
    )
    .eq("id", conversation.id)
    .single();

  return NextResponse.json({ data: fullConv }, { status: 201 });
}
