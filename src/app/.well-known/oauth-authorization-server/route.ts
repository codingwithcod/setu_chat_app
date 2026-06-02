/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 *
 * GET /.well-known/oauth-authorization-server
 *
 * Returns the metadata document that MCP clients use to discover
 * authorization, token, and registration endpoints.
 */

import { NextResponse } from "next/server";
import { ALL_SCOPES_STRING } from "@/lib/oauth/scopes";

export async function GET() {
  const issuer = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const metadata = {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    scopes_supported: ALL_SCOPES_STRING.split(" "),
    service_documentation: `${issuer}/docs/mcp-server`,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version",
    },
  });
}
