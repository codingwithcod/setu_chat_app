import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

// Get all conversations for the current user
export async function GET() {
  const serviceClient = await createServiceClient();

  // Hot read path — verify the JWT locally instead of round-tripping to
  // Supabase Auth. See src/lib/auth/verify-token.ts for the trade-off.
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch every conversation the user belongs to — with members + member
  // profiles nested — in ONE call. This RPC replaces what used to be two serial
  // queries (read conversation_members for ids, then fetch conversations with
  // members). SECURITY DEFINER inside the function bypasses the recursive RLS
  // policy on conversation_members, same as the old service-client path.
  const { data: conversations, error } = await serviceClient.rpc(
    "get_user_conversations",
    { p_user_id: auth.userId }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const conversationIds = (conversations as Array<{ id: string }>).map(
    (c) => c.id
  );

  // Last message + unread count for every conversation in ONE call.
  const { data: previews } = await serviceClient.rpc(
    "get_conversation_previews",
    { p_user_id: auth.userId, p_conversation_ids: conversationIds }
  );

  const previewMap = new Map(
    (
      (previews as Array<{
        conversation_id: string;
        last_message: unknown;
        unread_count: number;
      }>) || []
    ).map((p) => [p.conversation_id, p])
  );

  const conversationsWithLastMessage = (
    conversations as Array<{ id: string }>
  ).map((conv) => {
    const pv = previewMap.get(conv.id);
    return {
      ...conv,
      last_message: pv?.last_message ?? null,
      unread_count: Number(pv?.unread_count ?? 0),
    };
  });

  return NextResponse.json({ data: conversationsWithLastMessage });
}

// Create a new conversation (private or group)
export async function POST(request: Request) {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = { id: auth.userId };

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

    // Get-or-create the private conversation in ONE call. This replaces the old
    // N+1 (a loop over every conversation the user belonged to, 2 queries each)
    // with a single RPC that finds the existing DM between the two users or
    // creates it, and returns the full conversation in the same shape.
    const { data: result, error: rpcError } = await serviceClient.rpc(
      "get_or_create_private_conversation",
      { p_user_id: user.id, p_other_user_id: otherUserId }
    );

    if (rpcError) {
      console.error(
        "[API POST /api/conversations] get_or_create_private_conversation failed:",
        rpcError.message
      );
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const { conversation, existing } = (result ?? {}) as {
      conversation?: unknown;
      existing?: boolean;
    };

    // Existing DM → 200 with existing:true; freshly created → 201. Matches the
    // old responses exactly.
    if (existing) {
      return NextResponse.json({ data: conversation, existing: true });
    }
    return NextResponse.json({ data: conversation }, { status: 201 });
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
