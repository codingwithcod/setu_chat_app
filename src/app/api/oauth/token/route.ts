/**
export const dynamic = "force-dynamic";
 * OAuth 2.1 Token Endpoint
 *
 * POST /api/oauth/token
 *
 * Handles two grant types:
 *  - authorization_code: exchange an auth code (+ PKCE verifier) for tokens
 *  - refresh_token: exchange a refresh token for a new token pair
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  exchangeAuthorizationCode,
  refreshAccessToken,
} from "@/lib/oauth/oauth-server";

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Token endpoint accepts application/x-www-form-urlencoded or JSON
    let params: Record<string, string>;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      params = Object.fromEntries(formData.entries()) as Record<string, string>;
    } else {
      params = await request.json();
    }

    const grantType = params.grant_type;

    if (!grantType) {
      return oauthError("invalid_request", "grant_type is required");
    }

    const db = await createServiceClient();

    // ── authorization_code grant ──────────────────────────
    if (grantType === "authorization_code") {
      const { code, client_id, redirect_uri, code_verifier } = params;

      if (!code || !client_id || !redirect_uri || !code_verifier) {
        return oauthError(
          "invalid_request",
          "code, client_id, redirect_uri, and code_verifier are required"
        );
      }

      const result = await exchangeAuthorizationCode(db, {
        code,
        clientId: client_id,
        redirectUri: redirect_uri,
        codeVerifier: code_verifier,
      });

      if ("error" in result) {
        return NextResponse.json(result.error, {
          status: result.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        });
      }

      return NextResponse.json(result.data, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      });
    }

    // ── refresh_token grant ───────────────────────────────
    if (grantType === "refresh_token") {
      const { refresh_token, client_id, scope } = params;

      if (!refresh_token || !client_id) {
        return oauthError(
          "invalid_request",
          "refresh_token and client_id are required"
        );
      }

      const result = await refreshAccessToken(db, {
        refreshToken: refresh_token,
        clientId: client_id,
        scope,
      });

      if ("error" in result) {
        return NextResponse.json(result.error, {
          status: result.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        });
      }

      return NextResponse.json(result.data, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      });
    }

    return oauthError("unsupported_grant_type", `Unsupported grant_type: ${grantType}`);
  } catch {
    return oauthError("server_error", "Internal server error", 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
