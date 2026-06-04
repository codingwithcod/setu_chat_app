import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
// A session counts as "active" if it pinged within this window.
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

// GET /api/admin/sessions?q=&page=1&status=&device=
// Active device sessions across the platform, most-recently-active first.
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status"); // active | idle
  const device = sp.get("device"); // desktop | mobile | tablet
  const userId = sp.get("user"); // optional: filter to one user
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

  let query = serviceClient
    .from("user_sessions")
    .select(
      `id, device_name, device_type, browser_name, os_name, ip_address,
       location, last_active_at, created_at,
       user:user_id(id, full_name, username, email, avatar_url)`,
      { count: "exact" }
    )
    .order("last_active_at", { ascending: false })
    .range(from, to);

  if (userId) query = query.eq("user_id", userId);
  if (status === "active") query = query.gte("last_active_at", activeSince);
  if (status === "idle") query = query.lt("last_active_at", activeSince);
  // device_type is like 'desktop_browser' / 'mobile_app' — match the prefix.
  if (device) query = query.ilike("device_type", `${device}%`);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sessions: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    activeSince,
  });
}
