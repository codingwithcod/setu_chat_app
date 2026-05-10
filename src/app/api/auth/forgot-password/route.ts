import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateToken } from "@/lib/utils";
import { forgotPasswordSchema } from "@/lib/validations";

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email with a 10-minute token.
 * Always returns success to prevent email enumeration.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = forgotPasswordSchema.parse(body);

    const supabase = await createServiceClient();

    // Look up user by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name, auth_providers")
      .eq("email", validated.email)
      .single();

    // If no user found or user is Google-only, return success silently
    // (prevents email enumeration)
    if (!profile) {
      return NextResponse.json({
        message:
          "If an account exists with that email, you'll receive a password reset link shortly.",
      });
    }

    // Google-only users can't reset a password they don't have
    if (
      !profile.auth_providers?.includes("email")
    ) {
      return NextResponse.json({
        message:
          "If an account exists with that email, you'll receive a password reset link shortly.",
      });
    }

    // Delete any existing reset tokens for this user (prevent accumulation)
    await supabase
      .from("verification_tokens")
      .delete()
      .eq("user_id", profile.id);

    // Generate new token with 10-minute expiry
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase.from("verification_tokens").insert({
      user_id: profile.id,
      token,
      expires_at: expiresAt,
    });

    // Send reset email
    await sendPasswordResetEmail(
      validated.email,
      token,
      profile.first_name || "there"
    );

    return NextResponse.json({
      message:
        "If an account exists with that email, you'll receive a password reset link shortly.",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
