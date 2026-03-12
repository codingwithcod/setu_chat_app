import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { setPasswordSchema } from "@/lib/validations";

/**
 * POST /api/auth/set-password
 *
 * Allows Google-only users to create a password so they can
 * log in with either Google or email+password.
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

    const body = await request.json();
    const validated = setPasswordSchema.parse(body);

    const serviceClient = await createServiceClient();

    // Verify the user doesn't already have a password (i.e., is Google-only)
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("auth_providers")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (profile.auth_providers.includes("email")) {
      return NextResponse.json(
        { error: "You already have a password set" },
        { status: 400 }
      );
    }

    // Set password via Supabase Admin API
    const { error: updateError } =
      await serviceClient.auth.admin.updateUserById(user.id, {
        password: validated.password,
      });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // Add 'email' to auth_providers array
    const updatedProviders = [...profile.auth_providers, "email"];
    await serviceClient
      .from("profiles")
      .update({ auth_providers: updatedProviders })
      .eq("id", user.id);

    return NextResponse.json({
      message: "Password created successfully! You can now log in with your email and password.",
      auth_providers: updatedProviders,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid password format" },
        { status: 400 }
      );
    }
    console.error("[SetPassword] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
