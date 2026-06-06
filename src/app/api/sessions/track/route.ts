import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

const MAX_SESSIONS = 5;

/**
 * POST /api/sessions/track
 * Create or update a session record. Called on app load after auth.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = { id: auth.userId };

    const body = await request.json();
    const { sessionToken, deviceName, deviceType, browserName, osName } = body;

    if (!sessionToken || !deviceName || !deviceType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Extract IP address from headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    // Common path in ONE round-trip: update the session if it already exists.
    // The UPDATE both refreshes the row AND tells us whether it existed — a row
    // comes back only when a matching session was found, so we no longer need a
    // separate SELECT first. We intentionally DO NOT geolocate here: geolocation
    // is a slow external call (up to 3s) and is only meaningful once, when the
    // device first signs in. The location captured at creation is preserved.
    const { data: updatedSession } = await serviceClient
      .from("user_sessions")
      .update({
        last_active_at: new Date().toISOString(),
        ip_address: ip,
        device_name: deviceName,
        device_type: deviceType,
        browser_name: browserName,
        os_name: osName,
      })
      .eq("session_token", sessionToken)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (updatedSession) {
      return NextResponse.json({
        data: updatedSession,
        new_device_detected: false,
      });
    }

    // No existing session was updated → this is a new device. Fall through to
    // the (rarely hit) creation path below: geolocate, enforce the limit, insert.

    // New session — geolocate the IP once (best-effort, up to 3s) so we can
    // show where this device signed in from. Only runs on creation, never on
    // subsequent app loads for the same session.
    let location: string | null = null;
    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geoRes = await fetch(
          `http://ip-api.com/json/${ip}?fields=status,city,country`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.status === "success" && geoData.city && geoData.country) {
            location = `${geoData.city}, ${geoData.country}`;
          }
        }
      } catch {
        // Geolocation is best-effort — silently ignore failures
      }
    }

    // Enforce max session limit
    const { data: userSessions } = await serviceClient
      .from("user_sessions")
      .select("id, last_active_at")
      .eq("user_id", user.id)
      .order("last_active_at", { ascending: true });

    if (userSessions && userSessions.length >= MAX_SESSIONS) {
      // Remove the oldest sessions to make room
      const sessionsToRemove = userSessions.slice(
        0,
        userSessions.length - MAX_SESSIONS + 1
      );
      const idsToRemove = sessionsToRemove.map((s) => s.id);

      await serviceClient
        .from("user_sessions")
        .delete()
        .in("id", idsToRemove);
    }

    // Insert new session
    const { data: newSession, error: insertError } = await serviceClient
      .from("user_sessions")
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        device_name: deviceName,
        device_type: deviceType,
        browser_name: browserName || null,
        os_name: osName || null,
        ip_address: ip,
        location,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create session:", insertError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: newSession,
      new_device_detected: true,
    });
  } catch (error) {
    console.error("Session tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
