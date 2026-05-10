import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validations";

/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and sets a new password.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = resetPasswordSchema.parse(body);

    const supabase = await createServiceClient();

    // Find the token
    const { data: tokenData, error: tokenError } = await supabase
      .from("verification_tokens")
      .select("*")
      .eq("token", validated.token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Clean up expired token
      await supabase
        .from("verification_tokens")
        .delete()
        .eq("id", tokenData.id);

      return NextResponse.json(
        {
          error:
            "This reset link has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Update user password via Supabase Admin API
    const { error: updateError } =
      await supabase.auth.admin.updateUserById(tokenData.user_id, {
        password: validated.password,
      });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // Delete the used token
    await supabase
      .from("verification_tokens")
      .delete()
      .eq("id", tokenData.id);

    return NextResponse.json({
      message:
        "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input. Please check your password requirements." },
        { status: 400 }
      );
    }
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
