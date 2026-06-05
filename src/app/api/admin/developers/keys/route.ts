import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [10, 20, 50, 100];

// GET /api/admin/developers/keys?q=&page=1&pageSize=20&status= — API keys with owner.
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const status = sp.get("status"); // active | inactive
  const sizeParam = parseInt(sp.get("pageSize") || "20", 10);
  const PAGE_SIZE = PAGE_SIZES.includes(sizeParam) ? sizeParam : 20;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = serviceClient
    .from("api_keys")
    .select(
      `id, name, key_prefix, rate_limit_rpm, total_requests, is_active,
       last_used_at, expires_at, created_at,
       owner:user_id(id, full_name, username, avatar_url)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.ilike("name", `%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    keys: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}
