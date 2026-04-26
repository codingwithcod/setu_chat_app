import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  decryptSecret,
  encryptSecret,
  verifyTotpCode,
  generateBackupCodes,
  checkTotpRateLimit,
  resetTotpRateLimit,
} from "@/lib/totp";

/**
 * POST /api/auth/totp/confirm-setup
 *
 * Verifies the second TOTP code and activates 2FA.
 * The second code must differ from the first (to prove the authenticator
 * is generating new codes across time windows).
 * On success, generates backup codes and enables 2FA on the profile.
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

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Fetch the setup session (must be in 'first_verified' state)
    const { data: session, error: sessionError } = await serviceClient
      .from("totp_setup_sessions")
      .select("*")
      .eq("id", setupId)
      .eq("user_id", user.id)
      .eq("status", "first_verified")
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

    // The second code must differ from the first
    if (code === session.first_code) {
      return NextResponse.json(
        {
          error: "Please wait for a new code. The second code must be different from the first.",
          remainingAttempts: rateLimit.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Decrypt and verify the second TOTP code
    const rawSecret = decryptSecret(session.temp_secret);
    const delta = verifyTotpCode(rawSecret, code);

    if (delta === null) {
      return NextResponse.json(
        {
          error: "Invalid code. Please try the latest code from your authenticator app.",
          remainingAttempts: rateLimit.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Both codes verified! Activate 2FA.
    // Re-encrypt the secret for permanent storage
    const permanentEncryptedSecret = encryptSecret(rawSecret);
    const { plainCodes, hashedCodes } = generateBackupCodes();

    // Update profile with TOTP data
    const { error: profileError } = await serviceClient
      .from("profiles")
      .update({
        totp_enabled: true,
        totp_secret: permanentEncryptedSecret,
        totp_verified_at: new Date().toISOString(),
        totp_backup_codes: hashedCodes,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("[TOTP Confirm] Profile update error:", profileError);
      return NextResponse.json(
        { error: "Failed to enable 2FA" },
        { status: 500 }
      );
    }

    // Mark setup session as confirmed
    await serviceClient
      .from("totp_setup_sessions")
      .update({ status: "confirmed" })
      .eq("id", setupId);

    // Reset rate limit
    resetTotpRateLimit(`setup:${user.id}`);

    return NextResponse.json({
      success: true,
      backupCodes: plainCodes,
      message: "Two-factor authentication has been enabled!",
    });
  } catch (error) {
    console.error("[TOTP Confirm] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
