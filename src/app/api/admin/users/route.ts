import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [10, 20, 50, 100];

// GET /api/admin/users?q=&page=1&pageSize=20&role=&status=
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const role = sp.get("role"); // 'admin' | 'user' | null
  const status = sp.get("status"); // 'online' | 'banned' | 'verified' | null
  const sizeParam = parseInt(sp.get("pageSize") || "20", 10);
  const PAGE_SIZE = PAGE_SIZES.includes(sizeParam) ? sizeParam : 20;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = serviceClient
    .from("profiles")
    .select(
      "id, email, username, full_name, avatar_url, auth_providers, is_email_verified, is_online, is_banned, role, totp_enabled, last_seen, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.or(
      `email.ilike.%${q}%,username.ilike.%${q}%,full_name.ilike.%${q}%`
    );
  }
  if (role === "admin" || role === "user") query = query.eq("role", role);
  if (status === "online") query = query.eq("is_online", true);
  if (status === "banned") query = query.eq("is_banned", true);
  if (status === "verified") query = query.eq("is_email_verified", true);
  if (status === "not_verified") query = query.eq("is_email_verified", false);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    users: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}
