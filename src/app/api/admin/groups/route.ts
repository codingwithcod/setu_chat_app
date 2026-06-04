import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// GET /api/admin/groups?q=&page=1 — list group conversations with member counts.
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = serviceClient
    .from("conversations")
    .select(
      "id, name, description, avatar_url, created_at, last_message_at, creator:created_by(full_name, username), members:conversation_members(count)",
      { count: "exact" }
    )
    .eq("type", "group")
    .order("last_message_at", { ascending: false })
    .range(from, to);

  if (q) query = query.ilike("name", `%${q}%`);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the embedded count aggregate into a plain number.
  const groups = (data ?? []).map(
    (g: {
      members?: { count: number }[];
      [k: string]: unknown;
    }) => ({
      ...g,
      member_count: g.members?.[0]?.count ?? 0,
      members: undefined,
    })
  );

  return NextResponse.json({
    groups,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}
