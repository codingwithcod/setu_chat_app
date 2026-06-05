import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const VALID_REASONS = [
  "spam",
  "harassment",
  "hate",
  "violence",
  "sexual",
  "other",
] as const;

// POST /api/messages/:id/report — a conversation member flags a message for
// moderator review. One report per (message, reporter).
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

  const { reason, details } = await request.json().catch(() => ({}));

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid report reason" }, { status: 400 });
  }

  // Load the message + verify the reporter is a member of its conversation
  // (you can only report what you're allowed to see), and isn't reporting
  // their own message.
  const { data: message } = await serviceClient
    .from("messages")
    .select("id, sender_id, conversation_id")
    .eq("id", params.id)
    .single();

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.sender_id === user.id) {
    return NextResponse.json(
      { error: "You cannot report your own message" },
      { status: 400 }
    );
  }

  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", message.conversation_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await serviceClient.from("message_reports").insert({
    message_id: message.id,
    conversation_id: message.conversation_id,
    reporter_id: user.id,
    reason,
    details: typeof details === "string" ? details.slice(0, 500) : null,
  });

  // Duplicate (already reported by this user) — treat as success, idempotent.
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, alreadyReported: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
