import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";
  const isLinking = searchParams.get("linking") === "google";

  if (code) {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("username, first_name, last_name, auth_providers")
          .eq("id", user.id)
          .single();

        const authProviders: string[] = profile?.auth_providers ?? [];

        // --- LINKING FLOW: User came from Settings "Connect Google" ---
        // Email mismatch check must run FIRST, before any provider checks,
        // because the OAuth might have authenticated a completely different user.
        if (isLinking) {
          const expectedEmail = searchParams.get("expected_email");
          if (expectedEmail && user.email !== expectedEmail) {
            // Wrong Google account selected — sign out and redirect with error
            await supabase.auth.signOut({ scope: "local" });
            return NextResponse.redirect(
              `${origin}/login?error=google_email_mismatch`
            );
          }

          // Email matches — add 'google' to auth_providers if not already there
          if (!authProviders.includes("google")) {
            const updatedProviders = [...authProviders, "google"];
            await serviceClient
              .from("profiles")
              .update({
                auth_providers: updatedProviders,
                is_email_verified: true,
              })
              .eq("id", user.id);
          }

          return NextResponse.redirect(`${origin}/settings?linked=google`);
        }

        // --- GUARD: Block Google OAuth login if user hasn't linked Google ---
        // If this is NOT an explicit linking request and user doesn't have 'google' in auth_providers,
        // it means an email-only user tried to log in with Google directly — block it.
        if (!authProviders.includes("google")) {
          await supabase.auth.signOut({ scope: "local" });
          return NextResponse.redirect(
            `${origin}/login?error=google_not_linked`
          );
        }

        // Extract real name from Google OAuth metadata
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || "";
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = meta.given_name || nameParts[0] || "";
        const lastName = meta.family_name || nameParts.slice(1).join(" ") || "";

        // Update first_name/last_name if they look like email prefix or are missing
        const currentFirst = profile?.first_name || "";
        const needsNameUpdate =
          !currentFirst ||
          currentFirst === user.email?.split("@")[0] ||
          (firstName && currentFirst !== firstName);

        if (needsNameUpdate && firstName) {
          await serviceClient
            .from("profiles")
            .update({
              first_name: firstName,
              last_name: lastName,
            })
            .eq("id", user.id);
        }

        // Update avatar from Google if not already set
        if (meta.picture || meta.avatar_url) {
          const { data: currentProfile } = await serviceClient
            .from("profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .single();

          if (!currentProfile?.avatar_url) {
            await serviceClient
              .from("profiles")
              .update({ avatar_url: meta.picture || meta.avatar_url })
              .eq("id", user.id);
          }
        }

        // If no username, redirect to username selection
        if (!profile?.username) {
          return NextResponse.redirect(`${origin}/select-username`);
        }

        // Check if TOTP 2FA is enabled — redirect to verify-totp
        const { data: totpProfile } = await serviceClient
          .from("profiles")
          .select("totp_enabled")
          .eq("id", user.id)
          .single();

        if (totpProfile?.totp_enabled) {
          const totpRedirect = NextResponse.redirect(
            `${origin}/login/verify-totp`
          );
          totpRedirect.cookies.set("totp_pending", "true", {
            maxAge: 300, // 5 minutes
            path: "/",
            sameSite: "lax",
          });
          return totpRedirect;
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

