import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
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

  // One RPC fans the forward out: resolve/create a private conversation per
  // target user, then insert the forwarded message + copy files into every
  // target conversation — all in a single DB round-trip. Replaces the previous
  // N+1 (a conversation create per new DM) + per-conversation update waterfall.
  const { data: result, error: rpcError } = await serviceClient.rpc(
    "forward_message",
    {
      p_user_id: user.id,
      p_message_id: messageId,
      p_conversation_ids: conversationIds,
      p_user_ids: userIds,
    }
  );

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const r = (result ?? {}) as {
    error?: string;
    data?: unknown[];
    forwardedCount?: number;
    errorCount?: number;
  };

  if (r.error === "not_found") {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const results = r.data ?? [];
  const forwardedCount = r.forwardedCount ?? 0;
  const errorCount = r.errorCount ?? 0;

  // Preserve the old rule: nothing succeeded but something errored → 500.
  if (forwardedCount === 0 && errorCount > 0) {
    return NextResponse.json(
      { error: "Failed to forward message" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: results,
    forwardedCount,
    message: `Message forwarded to ${forwardedCount} conversation(s)`,
  });
}
