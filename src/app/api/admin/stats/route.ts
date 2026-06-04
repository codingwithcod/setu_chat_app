import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/stats — platform overview counters + daily trend.
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const [stats, trend] = await Promise.all([
    serviceClient.rpc("admin_platform_stats"),
    serviceClient.rpc("admin_daily_trend", { days: 14 }),
  ]);

  if (stats.error) {
    return NextResponse.json({ error: stats.error.message }, { status: 500 });
  }

  return NextResponse.json({
    stats: stats.data,
    trend: trend.data ?? [],
  });
}
