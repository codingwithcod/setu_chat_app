import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/reports/:id
 * Body: { action: 'dismiss' | 'delete_message' }
 *  - dismiss        → mark this report resolved, no action on the message.
 *  - delete_message → soft-delete the reported message AND resolve every
 *                     pending report pointing at it (one action clears the
 *                     whole cluster of duplicate reports).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { serviceClient, userId } = gate;

  const { action } = await request.json().catch(() => ({}));
  const reviewedAt = new Date().toISOString();

  if (action === "dismiss") {
    const { error } = await serviceClient
      .from("message_reports")
      .update({ status: "dismissed", reviewed_by: userId, reviewed_at: reviewedAt })
      .eq("id", params.id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete_message") {
    // Look up the message this report targets.
    const { data: report } = await serviceClient
      .from("message_reports")
      .select("message_id")
      .eq("id", params.id)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Soft-delete the message (same shape the app uses).
    const { error: delErr } = await serviceClient
      .from("messages")
      .update({ is_deleted: true, content: "" })
      .eq("id", report.message_id);
    if (delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Resolve all pending reports for that message.
    const { error: updErr } = await serviceClient
      .from("message_reports")
      .update({ status: "actioned", reviewed_by: userId, reviewed_at: reviewedAt })
      .eq("message_id", report.message_id)
      .eq("status", "pending");
    if (updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
