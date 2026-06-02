/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 *
 * POST /api/oauth/register
 *
 * MCP clients auto-register themselves before starting the OAuth flow.
 * No authentication is required for this endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { registerClient } from "@/lib/oauth/oauth-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const db = await createServiceClient();
    const result = await registerClient(db, body);

    if ("error" in result) {
      return NextResponse.json(result.error, { status: 400 });
    }

    return NextResponse.json(result.data, {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
