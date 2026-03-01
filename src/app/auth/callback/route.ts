import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

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
          .select("username, first_name, last_name")
          .eq("id", user.id)
          .single();

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
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
