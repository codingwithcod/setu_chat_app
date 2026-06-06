/**
export const dynamic = "force-dynamic";
 * Validate an OAuth client — used by the consent page to show client name.
 *
 * GET /api/oauth/validate-client?client_id=...&redirect_uri=...
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getClient, isValidRedirectUri } from "@/lib/oauth/oauth-server";

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");
  const redirectUri = request.nextUrl.searchParams.get("redirect_uri");

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "client_id and redirect_uri are required" },
      { status: 400 }
    );
  }

  const db = await createServiceClient();
  const client = await getClient(db, clientId);

  if (!client) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Unknown client_id" },
      { status: 404 }
    );
  }

  if (!isValidRedirectUri(client, redirectUri)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uri not registered for this client" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    client_name: client.client_name,
    client_uri: client.client_uri,
    logo_uri: client.logo_uri,
  });
}
