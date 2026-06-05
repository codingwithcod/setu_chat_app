import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const ALLOWED_RANGES = [7, 30, 90];

// GET /api/admin/analytics?days=30 — overview metrics + daily trend.
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  let days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
  if (!ALLOWED_RANGES.includes(days)) days = 30;

  const [overview, trend] = await Promise.all([
    serviceClient.rpc("admin_analytics_overview"),
    serviceClient.rpc("admin_daily_trend", { days }),
  ]);

  if (overview.error) {
    return NextResponse.json({ error: overview.error.message }, { status: 500 });
  }

  return NextResponse.json({
    overview: overview.data,
    trend: trend.data ?? [],
    days,
  });
}
