import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  generateTotpSecret,
  generateTotpUri,
  encryptSecret,
} from "@/lib/totp";
import QRCode from "qrcode";

/**
 * POST /api/auth/totp/setup
 *
 * Initiates TOTP 2FA setup. Generates a secret, creates a setup session,
 * and returns a QR code for the user to scan with their authenticator app.
 */
export async function POST() {
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

    const serviceClient = await createServiceClient();

    // Check if user already has TOTP enabled
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("totp_enabled, email")
      .eq("id", user.id)
      .single();

    if (profile?.totp_enabled) {
      return NextResponse.json(
        { error: "2FA is already enabled. Disable it first to set up again." },
        { status: 400 }
      );
    }

    // Cancel any existing pending setup sessions
    await serviceClient
      .from("totp_setup_sessions")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    await serviceClient
      .from("totp_setup_sessions")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "first_verified");

    // Generate new TOTP secret
    const rawSecret = generateTotpSecret();
    const encryptedSecret = encryptSecret(rawSecret);

    // Create setup session (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data: setupSession, error: setupError } = await serviceClient
      .from("totp_setup_sessions")
      .insert({
        user_id: user.id,
        temp_secret: encryptedSecret,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (setupError || !setupSession) {
      console.error("[TOTP Setup] Error creating setup session:", setupError);
      return NextResponse.json(
        { error: "Failed to initiate 2FA setup" },
        { status: 500 }
      );
    }

    // Generate QR code as data URL
    const email = profile?.email || user.email || "user";
    const otpUri = generateTotpUri(rawSecret, email);
    const qrCodeDataUrl = await QRCode.toDataURL(otpUri, {
      width: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Format secret in groups of 4 for easy manual entry
    const formattedSecret = rawSecret.match(/.{1,4}/g)?.join(" ") || rawSecret;

    return NextResponse.json({
      setupId: setupSession.id,
      qrCodeUrl: qrCodeDataUrl,
      secret: formattedSecret,
    });
  } catch (error) {
    console.error("[TOTP Setup] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
