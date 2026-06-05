import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

// Toggle pin/unpin a conversation for the current user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const serviceClient = await createServiceClient();
  const { id: conversationId } = await params;

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = { id: auth.userId };

  // Check if user is a member of this conversation
  const { data: membership, error: memberError } = await serviceClient
    .from("conversation_members")
    .select("id, pinned_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return NextResponse.json(
      { error: "You are not a member of this conversation" },
      { status: 403 }
    );
  }

  // Toggle: if pinned, unpin; if unpinned, pin
  const isPinned = !!membership.pinned_at;
  const newPinnedAt = isPinned ? null : new Date().toISOString();

  const { error: updateError } = await serviceClient
    .from("conversation_members")
    .update({ pinned_at: newPinnedAt })
    .eq("id", membership.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { pinned: !isPinned, pinned_at: newPinnedAt },
  });
}
