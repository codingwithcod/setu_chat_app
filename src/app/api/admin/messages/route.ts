import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

// GET /api/admin/messages?q=&page=1&type=&status=
// Recent-first moderation feed across every conversation.
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient } = gate;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const type = sp.get("type"); // text | image | file | system
  const status = sp.get("status"); // deleted | edited
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = serviceClient
    .from("messages")
    .select(
      `id, content, message_type, is_edited, is_deleted, created_at,
       sender:sender_id(id, full_name, username, avatar_url),
       conversation:conversation_id(id, type, name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.ilike("content", `%${q}%`);
  if (type) query = query.eq("message_type", type);
  if (status === "deleted") query = query.eq("is_deleted", true);
  if (status === "edited") query = query.eq("is_edited", true);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  });
}
