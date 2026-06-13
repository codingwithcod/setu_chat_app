import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

/**
 * POST /api/auth/google-callback
 *
 * Mobile-specific post-OAuth processor. After the mobile app completes Google
 * OAuth and sets the Supabase session locally, it calls this endpoint with the
 * Bearer token so the server can run the same business logic as the web's
 * `/auth/callback` route:
 *
 *   1. First-time signup  → create profile, return `select_username`
 *   2. Returning login    → sync profile, return `proceed` (or `verify_totp`)
 *   3. Email-only user    → block with `google_not_linked`
 */
export async function POST() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = await createServiceClient();

    // Fetch the full Supabase auth user (with metadata & identities).
    const { data: authData, error: authError } =
      await serviceClient.auth.admin.getUserById(auth.userId);

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = authData.user;
    const meta = user.user_metadata || {};

    // Fetch existing profile.
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("username, first_name, last_name, avatar_url, auth_providers, totp_enabled")
      .eq("id", user.id)
      .single();

    const authProviders: string[] = profile?.auth_providers ?? [];

    // --- FIRST-TIME GOOGLE SIGNUP ---
    // No profile at all, or profile exists but no providers set.
    if (!profile || authProviders.length === 0) {
      const fullName = meta.full_name || meta.name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = meta.given_name || nameParts[0] || "";
      const lastName =
        meta.family_name || nameParts.slice(1).join(" ") || "";

      if (profile) {
        // Profile row exists (created by trigger) but no providers set — update it.
        await serviceClient
          .from("profiles")
          .update({
            auth_providers: ["google"],
            is_email_verified: true,
            first_name: firstName || profile.first_name,
            last_name: lastName || profile.last_name,
            avatar_url:
              meta.picture || meta.avatar_url || profile.avatar_url || undefined,
          })
          .eq("id", user.id);
      }

      // New user needs to pick a username.
      if (!profile?.username) {
        return NextResponse.json({
          action: "select_username",
          firstName,
          lastName,
          avatarUrl: meta.picture || meta.avatar_url || null,
        });
      }
    }

    // --- GUARD: Block Google login if user hasn't linked Google ---
    if (
      profile &&
      authProviders.length > 0 &&
      !authProviders.includes("google")
    ) {
      // Sign out this session server-side to prevent the user from staying
      // authenticated with a provider they shouldn't be using.
      return NextResponse.json({
        action: "blocked",
        error: "google_not_linked",
        message:
          "Your account was created with email & password. To sign in with Google, first log in with your password, then connect Google from Settings → Linked Accounts.",
      });
    }

    // --- RETURNING GOOGLE LOGIN ---
    // Sync name if needed.
    const fullName = meta.full_name || meta.name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = meta.given_name || nameParts[0] || "";
    const lastName =
      meta.family_name || nameParts.slice(1).join(" ") || "";

    const currentFirst = profile?.first_name || "";
    const needsNameUpdate =
      !currentFirst ||
      currentFirst === user.email?.split("@")[0] ||
      (firstName && currentFirst !== firstName);

    if (needsNameUpdate && firstName) {
      await serviceClient
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", user.id);
    }

    // Sync avatar from Google if not already set.
    const googleAvatar = meta.picture || meta.avatar_url;
    if (googleAvatar && !profile?.avatar_url) {
      await serviceClient
        .from("profiles")
        .update({ avatar_url: googleAvatar })
        .eq("id", user.id);
    }

    // Ensure the user has a username (edge case: half-completed signup).
    if (!profile?.username) {
      return NextResponse.json({
        action: "select_username",
        firstName: firstName || profile?.first_name || "",
        lastName: lastName || profile?.last_name || "",
        avatarUrl: googleAvatar || profile?.avatar_url || null,
      });
    }

    // Create "Saved Messages" if it doesn't exist.
    const { data: existingSelf } = await serviceClient
      .from("conversations")
      .select("id")
      .eq("type", "self")
      .eq("created_by", user.id)
      .limit(1)
      .single();

    if (!existingSelf) {
      const { data: newConv } = await serviceClient
        .from("conversations")
        .insert({
          type: "self",
          name: "Saved Messages",
          created_by: user.id,
        })
        .select()
        .single();

      if (newConv) {
        await serviceClient.from("conversation_members").insert({
          conversation_id: newConv.id,
          user_id: user.id,
          role: "admin",
        });
      }
    }

    // Check TOTP 2FA.
    if (profile?.totp_enabled) {
      return NextResponse.json({ action: "verify_totp" });
    }

    return NextResponse.json({ action: "proceed" });
  } catch (error) {
    console.error("[GoogleCallback] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
