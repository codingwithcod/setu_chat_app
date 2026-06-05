import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getAppSettings, invalidateAppSettingsCache } from "@/lib/admin/settings";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

const FLAGS = ["allow_registration", "maintenance_mode"];

// GET /api/admin/settings — current platform flags.
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const settings = await getAppSettings(gate.serviceClient);
  return NextResponse.json({ settings });
}

// PATCH /api/admin/settings  Body: { key, value }
export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient, userId, email } = gate;

  const { key, value } = await request.json().catch(() => ({}));
  if (!FLAGS.includes(key) || typeof value !== "boolean") {
    return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  }

  const { error } = await serviceClient
    .from("app_settings")
    .update({ value, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateAppSettingsCache();
  await logAdminAction(serviceClient, {
    actorId: userId,
    actorEmail: email,
    action: "settings.update",
    targetType: "setting",
    targetId: key,
    targetLabel: `${key} → ${value ? "on" : "off"}`,
  });

  const settings = await getAppSettings(serviceClient);
  return NextResponse.json({ settings });
}
