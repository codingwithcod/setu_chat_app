import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get all conversations for the current user
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get conversation IDs the user is a member of
  const { data: memberOf } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (!memberOf || memberOf.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const conversationIds = memberOf.map((m) => m.conversation_id);

  // Get conversations with members and last message
  const { data: conversations, error } = await supabase
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
    .order("last_message_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get last message for each conversation
  const conversationsWithLastMessage = await Promise.all(
    (conversations || []).map(async (conv) => {
      const { data: messages } = await supabase
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
      const { data: readReceipt } = await supabase
        .from("read_receipts")
        .select("last_read_at")
        .eq("conversation_id", conv.id)
        .eq("user_id", user.id)
        .single();

      let unreadCount = 0;
      if (readReceipt) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .gt("created_at", readReceipt.last_read_at)
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

  return NextResponse.json({ data: conversationsWithLastMessage });
}

// Create a new conversation (private or group)
export async function POST(request: Request) {
  const supabase = await createClient();

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
    const { data: existingMembers } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (existingMembers) {
      for (const member of existingMembers) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("id, type")
          .eq("id", member.conversation_id)
          .eq("type", "private")
          .single();

        if (conv) {
          const { data: otherMember } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .eq("user_id", otherUserId)
            .single();

          if (otherMember) {
            // Return existing conversation
            const { data: fullConv } = await supabase
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
  const { data: conversation, error: convError } = await supabase
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
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  // Add members
  const members = [
    {
      conversation_id: conversation.id,
      user_id: user.id,
      role: type === "group" ? "admin" : "member",
    },
    ...memberIds.map((memberId: string) => ({
      conversation_id: conversation.id,
      user_id: memberId,
      role: "member",
    })),
  ];

  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert(members);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  // Return full conversation
  const { data: fullConv } = await supabase
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
