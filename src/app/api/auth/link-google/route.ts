import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/link-google
 *
 * Fallback helper to update the user's auth_providers array in the profiles table
 * after Google linking. The primary linking flow is handled in the auth callback
 * via the `?linking=google` parameter.
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

    // Get current profile
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

    if (profile.auth_providers.includes("google")) {
      return NextResponse.json(
        { error: "Google is already linked" },
        { status: 400 }
      );
    }

    // Verify that the user actually has a Google identity linked in Supabase Auth
    const hasGoogleIdentity = user.identities?.some(
      (identity) => identity.provider === "google"
    );

    if (!hasGoogleIdentity) {
      return NextResponse.json(
        { error: "Google identity not found. Please complete the Google linking process first." },
        { status: 400 }
      );
    }

    // Add 'google' to auth_providers array
    const updatedProviders = [...profile.auth_providers, "google"];
    await serviceClient
      .from("profiles")
      .update({
        auth_providers: updatedProviders,
        is_email_verified: true, // Google verifies email
      })
      .eq("id", user.id);

    return NextResponse.json({
      message: "Google account linked successfully!",
      auth_providers: updatedProviders,
    });
  } catch (error) {
    console.error("[LinkGoogle] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
