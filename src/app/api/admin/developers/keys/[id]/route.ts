import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

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
  const { serviceClient } = gate;

  const { action } = await request.json().catch(() => ({}));
  if (action !== "revoke" && action !== "restore") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { error } = await serviceClient
    .from("api_keys")
    .update({ is_active: action === "restore" })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
