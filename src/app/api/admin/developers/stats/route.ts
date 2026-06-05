import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/developers/stats — overview counters + top API consumers.
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const [stats, top] = await Promise.all([
    serviceClient.rpc("admin_developer_stats"),
    serviceClient.rpc("admin_top_api_consumers", { p_days: 7, p_limit: 10 }),
  ]);

  if (stats.error) {
    return NextResponse.json({ error: stats.error.message }, { status: 500 });
  }

  return NextResponse.json({
    stats: stats.data,
    topConsumers: top.data ?? [],
  });
}
