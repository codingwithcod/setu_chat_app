import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * DELETE /api/sessions/[id]
 * Revoke a specific session by its ID.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = params.id;
    const serviceClient = await createServiceClient();

    // Verify the session belongs to the current user
    const { data: session } = await serviceClient
      .from("user_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the session
    const { error } = await serviceClient
      .from("user_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Failed to revoke session:", error);
      return NextResponse.json(
        { error: "Failed to revoke session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Session revoked successfully" });
  } catch (error) {
    console.error("Revoke session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
