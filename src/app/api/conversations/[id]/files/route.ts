import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

// Get all attachments shared in a conversation (for the Files/Photos tabs)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only members may list a conversation's attachments
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", params.id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await serviceClient
    .from("message_files")
    .select(
      `
      id, message_id, file_url, file_name, file_size, file_type, mime_type, display_order, created_at,
      message:messages!inner(
        conversation_id, sender_id, is_deleted,
        sender:profiles(first_name, last_name)
      )
    `
    )
    .eq("message.conversation_id", params.id)
    .eq("message.is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the nested message join into sender_name
  const files = (data ?? []).map((f) => {
    const message = f.message as unknown as {
      sender_id: string;
      sender: { first_name: string; last_name: string } | null;
    };
    return {
      id: f.id,
      message_id: f.message_id,
      file_url: f.file_url,
      file_name: f.file_name,
      file_size: f.file_size,
      file_type: f.file_type,
      mime_type: f.mime_type,
      display_order: f.display_order,
      created_at: f.created_at,
      sender_name: message?.sender
        ? `${message.sender.first_name} ${message.sender.last_name}`.trim()
        : "Unknown",
    };
  });

  return NextResponse.json({ data: files });
}
