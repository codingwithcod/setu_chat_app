import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// DELETE /api/admin/groups/:id — remove a group conversation (cascades to
// members, messages, reactions, etc.).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const { error } = await serviceClient
    .from("conversations")
    .delete()
    .eq("id", params.id)
    .eq("type", "group");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
