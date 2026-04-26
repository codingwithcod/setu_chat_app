import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  decryptSecret,
  verifyTotpCode,
  verifyBackupCode,
  checkTotpRateLimit,
  resetTotpRateLimit,
} from "@/lib/totp";

/**
 * POST /api/auth/totp/disable
 *
 * Disables 2FA on the user's account.
 * Requires a valid TOTP code or backup code for security.
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
    const rateLimit = checkTotpRateLimit(`disable:${user.id}`);
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
    const { code, isBackupCode } = body;

    if (!code) {
      return NextResponse.json(
        { error: "A verification code is required to disable 2FA" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Fetch user's TOTP data
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("totp_enabled, totp_secret, totp_backup_codes")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (!profile.totp_enabled || !profile.totp_secret) {
      return NextResponse.json(
        { error: "2FA is not enabled on this account" },
        { status: 400 }
      );
    }

    // Verify the code
    let isValid = false;

    if (isBackupCode) {
      const normalizedCode = code.trim().toUpperCase();
      const backupCodes: string[] = profile.totp_backup_codes || [];
      const matchIndex = verifyBackupCode(normalizedCode, backupCodes);
      isValid = matchIndex !== -1;
    } else {
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: "Code must be 6 digits" },
          { status: 400 }
        );
      }

      const rawSecret = decryptSecret(profile.totp_secret);
      const delta = verifyTotpCode(rawSecret, code);
      isValid = delta !== null;
    }

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Invalid code. Please enter a valid authenticator or backup code.",
          remainingAttempts: rateLimit.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Code verified — disable 2FA
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({
        totp_enabled: false,
        totp_secret: null,
        totp_verified_at: null,
        totp_backup_codes: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[TOTP Disable] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to disable 2FA" },
        { status: 500 }
      );
    }

    // Reset rate limit
    resetTotpRateLimit(`disable:${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been disabled.",
    });
  } catch (error) {
    console.error("[TOTP Disable] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
