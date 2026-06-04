import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/messages/:id — soft-delete (matches the app's own
 * delete: flags is_deleted and clears content, so it disappears from chats
 * but the row is preserved for moderation history).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const { error } = await serviceClient
    .from("messages")
    .update({ is_deleted: true, content: "" })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
