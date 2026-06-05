import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

// DELETE /api/admin/groups/:id — remove a group conversation (cascades to
// members, messages, reactions, etc.).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient, userId, email } = gate;

  const { data: group } = await serviceClient
    .from("conversations")
    .select("name")
    .eq("id", params.id)
    .single();

  const { error } = await serviceClient
    .from("conversations")
    .delete()
    .eq("id", params.id)
    .eq("type", "group");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(serviceClient, {
    actorId: userId,
    actorEmail: email,
    action: "group.delete",
    targetType: "group",
    targetId: params.id,
    targetLabel: group?.name || "Untitled group",
  });
  return NextResponse.json({ ok: true });
}
