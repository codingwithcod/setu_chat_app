/**
 * OAuth Authorization Code endpoint — called by the consent page after user approves.
 *
 * POST /api/oauth/authorize
 *
 * This is a server-side endpoint (not the user-facing page). The consent page
 * POSTs here with the validated params after the user clicks "Authorize".
 * Returns an authorization code that the MCP client exchanges for tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getClient, isValidRedirectUri, createAuthorizationCode } from "@/lib/oauth/oauth-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, redirect_uri, scope, code_challenge, code_challenge_method } = body;

    // Validate required params
    if (!client_id || !redirect_uri || !code_challenge) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify user is logged in (via Supabase session cookie)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "login_required", error_description: "User is not authenticated" },
        { status: 401 }
      );
    }

    // Validate client
    const db = await createServiceClient();
    const client = await getClient(db, client_id);

    if (!client) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "Unknown client_id" },
        { status: 400 }
      );
    }

    if (!isValidRedirectUri(client, redirect_uri)) {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: "redirect_uri not registered" },
        { status: 400 }
      );
    }

    // Generate authorization code
    const code = await createAuthorizationCode(db, {
      clientId: client_id,
      userId: user.id,
      redirectUri: redirect_uri,
      scope: scope || "",
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method || "S256",
    });

    return NextResponse.json({ code });
  } catch {
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 }
    );
  }
}
