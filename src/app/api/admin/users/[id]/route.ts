import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/:id
 * Body: { action: 'promote' | 'demote' | 'ban' | 'unban' | 'logout' }
 * Admins cannot demote, ban, or force-logout themselves (lock-out guard).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient, userId, email } = gate;
  const targetId = params.id;

  const { action } = await request.json().catch(() => ({}));

  const isSelfDangerous =
    targetId === userId && ["demote", "ban", "logout"].includes(action);
  if (isSelfDangerous) {
    return NextResponse.json(
      { error: "You cannot perform this action on your own account" },
      { status: 400 }
    );
  }

  // Fetch a human-readable label for the audit log.
  const { data: target } = await serviceClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", targetId)
    .single();
  const label = target?.full_name?.trim() || target?.email || targetId;

  const audit = (act: string) =>
    logAdminAction(serviceClient, {
      actorId: userId,
      actorEmail: email,
      action: act,
      targetType: "user",
      targetId,
      targetLabel: label,
    });

  switch (action) {
    case "promote":
    case "demote": {
      const { error } = await serviceClient
        .from("profiles")
        .update({ role: action === "promote" ? "admin" : "user" })
        .eq("id", targetId);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      await audit(action === "promote" ? "user.promote" : "user.demote");
      return NextResponse.json({ ok: true });
    }
    case "ban":
    case "unban": {
      const banned = action === "ban";
      const { error } = await serviceClient
        .from("profiles")
        .update({ is_banned: banned })
        .eq("id", targetId);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      // Banning also kills all active sessions.
      if (banned) {
        await serviceClient.from("user_sessions").delete().eq("user_id", targetId);
      }
      await audit(banned ? "user.ban" : "user.unban");
      return NextResponse.json({ ok: true });
    }
    case "logout": {
      const { error } = await serviceClient
        .from("user_sessions")
        .delete()
        .eq("user_id", targetId);
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      await audit("user.logout");
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/users/:id — removes the auth user; the profile and all
 * related rows cascade. Admins cannot delete themselves.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient, userId, email } = gate;

  if (params.id === userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const { data: target } = await serviceClient
    .from("profiles")
    .select("email, full_name")
    .eq("id", params.id)
    .single();

  const { error } = await serviceClient.auth.admin.deleteUser(params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(serviceClient, {
    actorId: userId,
    actorEmail: email,
    action: "user.delete",
    targetType: "user",
    targetId: params.id,
    targetLabel: target?.full_name?.trim() || target?.email || params.id,
  });
  return NextResponse.json({ ok: true });
}
