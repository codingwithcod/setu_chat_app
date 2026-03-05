import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/sessions
 * List all active sessions for the current user.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current session token from header
    const currentToken = request.headers.get("x-session-token");

    const serviceClient = await createServiceClient();
    const { data: sessions, error } = await serviceClient
      .from("user_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("last_active_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // Mark the current session
    const sessionsWithCurrent = (sessions || []).map((s) => ({
      ...s,
      is_current: s.session_token === currentToken,
    }));

    return NextResponse.json({ data: sessionsWithCurrent });
  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions
 * Revoke all sessions except the current one.
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentToken = request.headers.get("x-session-token");

    if (!currentToken) {
      return NextResponse.json(
        { error: "Missing session token" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Delete all sessions for this user except the current one
    const { error } = await serviceClient
      .from("user_sessions")
      .delete()
      .eq("user_id", user.id)
      .neq("session_token", currentToken);

    if (error) {
      console.error("Failed to revoke sessions:", error);
      return NextResponse.json(
        { error: "Failed to revoke sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "All other sessions have been revoked",
    });
  } catch (error) {
    console.error("Revoke all sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
