import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  decryptSecret,
  verifyTotpCode,
  verifyBackupCode,
  checkTotpRateLimit,
  resetTotpRateLimit,
} from "@/lib/totp";

/**
 * POST /api/auth/totp/verify
 *
 * Verifies a TOTP code during login. This endpoint is called after the user
 * has authenticated with email/password or Google OAuth, but before they are
 * granted full access (while the totp_pending cookie is set).
 *
 * Also supports backup code verification.
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
    const rateLimit = checkTotpRateLimit(`login:${user.id}`);
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
        { error: "Code is required" },
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

    if (isBackupCode) {
      // Verify backup code
      const normalizedCode = code.trim().toUpperCase();
      const backupCodes: string[] = profile.totp_backup_codes || [];

      const matchIndex = verifyBackupCode(normalizedCode, backupCodes);

      if (matchIndex === -1) {
        return NextResponse.json(
          {
            error: "Invalid backup code",
            remainingAttempts: rateLimit.remainingAttempts,
          },
          { status: 400 }
        );
      }

      // Remove used backup code
      const updatedCodes = [...backupCodes];
      updatedCodes.splice(matchIndex, 1);

      await serviceClient
        .from("profiles")
        .update({ totp_backup_codes: updatedCodes })
        .eq("id", user.id);

      // Clear the totp_pending cookie
      const cookieStore = await cookies();
      cookieStore.set("totp_pending", "", {
        maxAge: 0,
        path: "/",
      });

      // Reset rate limit
      resetTotpRateLimit(`login:${user.id}`);

      return NextResponse.json({
        success: true,
        message: "Backup code accepted",
        remainingBackupCodes: updatedCodes.length,
      });
    }

    // Verify TOTP code
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 6 digits" },
        { status: 400 }
      );
    }

    const rawSecret = decryptSecret(profile.totp_secret);
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

    // Code is valid — clear the totp_pending cookie
    const cookieStore = await cookies();
    cookieStore.set("totp_pending", "", {
      maxAge: 0,
      path: "/",
    });

    // Reset rate limit
    resetTotpRateLimit(`login:${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
    });
  } catch (error) {
    console.error("[TOTP Verify] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
