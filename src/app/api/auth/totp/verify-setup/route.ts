import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  decryptSecret,
  verifyTotpCode,
  checkTotpRateLimit,
} from "@/lib/totp";

/**
 * POST /api/auth/totp/verify-setup
 *
 * Verifies the first TOTP code during 2FA setup.
 * The user must enter a valid code from their authenticator app
 * to prove they've correctly scanned the QR code.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Rate limit check
    const rateLimit = checkTotpRateLimit(`setup:${user.id}`);
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.ceil((rateLimit.retryAfterMs || 0) / 1000);
      return NextResponse.json(
        {
          error: `Too many attempts. Please try again in ${retryAfterSec} seconds.`,
          retryAfterMs: rateLimit.retryAfterMs,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { setupId, code } = body;

    if (!setupId || !code) {
      return NextResponse.json(
        { error: "Setup ID and code are required" },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Fetch the setup session
    const { data: session, error: sessionError } = await serviceClient
      .from("totp_setup_sessions")
      .select("*")
      .eq("id", setupId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Invalid or expired setup session. Please start again." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      await serviceClient
        .from("totp_setup_sessions")
        .update({ status: "cancelled" })
        .eq("id", setupId);

      return NextResponse.json(
        { error: "Setup session has expired. Please start again." },
        { status: 400 }
      );
    }

    // Decrypt and verify the TOTP code
    const rawSecret = decryptSecret(session.temp_secret);
    const delta = verifyTotpCode(rawSecret, code);

    if (delta === null) {
      return NextResponse.json(
        {
          error: "Invalid code. Make sure you're entering the code from your authenticator app.",
          remainingAttempts: rateLimit.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // First code verified — update session status and store the code
    const { error: updateError } = await serviceClient
      .from("totp_setup_sessions")
      .update({
        status: "first_verified",
        first_code: code,
      })
      .eq("id", setupId);

    if (updateError) {
      console.error("[TOTP Verify Setup] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update setup session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "First code verified! Now wait for a new code and enter it.",
    });
  } catch (error) {
    console.error("[TOTP Verify Setup] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
