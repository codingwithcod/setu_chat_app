import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/developers/keys/:id
 * Body: { action: 'revoke' | 'restore' } — toggle an API key on/off. A
 * revoked key stops authenticating immediately but is preserved (and its
 * usage history) for audit.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient, userId, email } = gate;

  const { action } = await request.json().catch(() => ({}));
  if (action !== "revoke" && action !== "restore") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: key } = await serviceClient
    .from("api_keys")
    .select("name")
    .eq("id", params.id)
    .single();

  const { error } = await serviceClient
    .from("api_keys")
    .update({ is_active: action === "restore" })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(serviceClient, {
    actorId: userId,
    actorEmail: email,
    action: action === "revoke" ? "api_key.revoke" : "api_key.restore",
    targetType: "api_key",
    targetId: params.id,
    targetLabel: key?.name,
  });
  return NextResponse.json({ ok: true });
}
