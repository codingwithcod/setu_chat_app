/**
 * OAuth 2.1 Authorization Server — core logic.
 *
 * Handles:
 *  - Dynamic Client Registration (RFC 7591)
 *  - Authorization code generation with PKCE
 *  - Token exchange (authorization_code + refresh_token grants)
 *  - Access token verification for the MCP handler
 *
 * All tokens are stored as SHA-256 hashes in Supabase (same pattern as api_keys).
 */

import crypto from "crypto";
import { hashKey } from "@/lib/api-key-auth";
import { parseScopes, scopesToPermissions, type PermissionScope } from "./scopes";

// ── Token format prefixes ───────────────────────────────────
const CLIENT_ID_PREFIX = "setu_oac_";
const ACCESS_TOKEN_PREFIX = "setu_oat_";
const REFRESH_TOKEN_PREFIX = "setu_ort_";
const AUTH_CODE_PREFIX = "setu_ocd_";

// ── Token lifetimes ─────────────────────────────────────────
const ACCESS_TOKEN_TTL_SECONDS = 3600;          // 1 hour
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 3600; // 30 days
const AUTH_CODE_TTL_SECONDS = 600;              // 10 minutes

// ── Helpers ─────────────────────────────────────────────────
function generateToken(prefix: string): string {
  return `${prefix}${crypto.randomBytes(32).toString("hex")}`;
}

function expiresAt(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

/**
 * Verify a PKCE code_verifier against the stored code_challenge (S256 only).
 */
function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const hash = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return hash === codeChallenge;
}

// ── Types ───────────────────────────────────────────────────
export interface OAuthClient {
  id: string;
  client_id: string;
  client_secret_hash: string | null;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string | null;
  client_uri: string | null;
  logo_uri: string | null;
  token_endpoint_auth_method: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface OAuthError {
  error: string;
  error_description: string;
}

// ── Dynamic Client Registration ─────────────────────────────
export async function registerClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  body: {
    client_name: string;
    redirect_uris: string[];
    grant_types?: string[];
    response_types?: string[];
    scope?: string;
    client_uri?: string;
    logo_uri?: string;
    token_endpoint_auth_method?: string;
  }
): Promise<{ data: Record<string, unknown> } | { error: OAuthError }> {
  if (!body.client_name || !body.redirect_uris?.length) {
    return {
      error: {
        error: "invalid_client_metadata",
        error_description: "client_name and at least one redirect_uri are required",
      },
    };
  }

  // Validate redirect URIs (must be localhost or HTTPS per MCP spec)
  for (const uri of body.redirect_uris) {
    try {
      const parsed = new URL(uri);
      const isLocalhost =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (!isLocalhost && parsed.protocol !== "https:") {
        return {
          error: {
            error: "invalid_redirect_uri",
            error_description: `Redirect URI must be localhost or HTTPS: ${uri}`,
          },
        };
      }
    } catch {
      return {
        error: {
          error: "invalid_redirect_uri",
          error_description: `Invalid redirect URI: ${uri}`,
        },
      };
    }
  }

  const clientId = generateToken(CLIENT_ID_PREFIX);
  const grantTypes = body.grant_types || ["authorization_code"];
  const responseTypes = body.response_types || ["code"];
  const authMethod = body.token_endpoint_auth_method || "none";

  // Generate client_secret for confidential clients
  let clientSecretRaw: string | undefined;
  let clientSecretHash: string | null = null;
  if (authMethod === "client_secret_post" || authMethod === "client_secret_basic") {
    clientSecretRaw = generateToken("setu_ocs_");
    clientSecretHash = hashKey(clientSecretRaw);
  }

  const { error: insertError } = await db.from("oauth_clients").insert({
    client_id: clientId,
    client_secret_hash: clientSecretHash,
    client_name: body.client_name,
    redirect_uris: body.redirect_uris,
    grant_types: grantTypes,
    response_types: responseTypes,
    scope: body.scope || null,
    client_uri: body.client_uri || null,
    logo_uri: body.logo_uri || null,
    token_endpoint_auth_method: authMethod,
  });

  if (insertError) {
    return {
      error: {
        error: "server_error",
        error_description: "Failed to register client",
      },
    };
  }

  const response: Record<string, unknown> = {
    client_id: clientId,
    client_name: body.client_name,
    redirect_uris: body.redirect_uris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: authMethod,
  };

  if (clientSecretRaw) {
    response.client_secret = clientSecretRaw;
  }

  return { data: response };
}

// ── Authorization Code ──────────────────────────────────────
export async function createAuthorizationCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: {
    clientId: string;
    userId: string;
    redirectUri: string;
    scope: string;
    codeChallenge: string;
    codeChallengeMethod: string;
  }
): Promise<string> {
  const code = generateToken(AUTH_CODE_PREFIX);
  const codeHash = hashKey(code);

  await db.from("oauth_authorization_codes").insert({
    code_hash: codeHash,
    client_id: params.clientId,
    user_id: params.userId,
    redirect_uri: params.redirectUri,
    scope: params.scope,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    expires_at: expiresAt(AUTH_CODE_TTL_SECONDS),
  });

  return code;
}

// ── Token Exchange ──────────────────────────────────────────
export async function exchangeAuthorizationCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: {
    code: string;
    clientId: string;
    redirectUri: string;
    codeVerifier: string;
  }
): Promise<{ data: TokenResponse } | { error: OAuthError; status: number }> {
  const codeHash = hashKey(params.code);

  // Look up the code
  const { data: codeRecord, error: lookupError } = await db
    .from("oauth_authorization_codes")
    .select("*")
    .eq("code_hash", codeHash)
    .single();

  if (lookupError || !codeRecord) {
    return {
      error: { error: "invalid_grant", error_description: "Invalid authorization code" },
      status: 400,
    };
  }

  // Validate
  if (codeRecord.used) {
    return {
      error: { error: "invalid_grant", error_description: "Authorization code already used" },
      status: 400,
    };
  }

  if (new Date(codeRecord.expires_at) < new Date()) {
    return {
      error: { error: "invalid_grant", error_description: "Authorization code expired" },
      status: 400,
    };
  }

  if (codeRecord.client_id !== params.clientId) {
    return {
      error: { error: "invalid_grant", error_description: "Client ID mismatch" },
      status: 400,
    };
  }

  if (codeRecord.redirect_uri !== params.redirectUri) {
    return {
      error: { error: "invalid_grant", error_description: "Redirect URI mismatch" },
      status: 400,
    };
  }

  // PKCE verification (required by OAuth 2.1)
  if (!verifyPkce(params.codeVerifier, codeRecord.code_challenge)) {
    return {
      error: { error: "invalid_grant", error_description: "PKCE code_verifier mismatch" },
      status: 400,
    };
  }

  // Mark code as used
  await db
    .from("oauth_authorization_codes")
    .update({ used: true })
    .eq("code_hash", codeHash);

  // Generate tokens
  return issueTokens(db, codeRecord.client_id, codeRecord.user_id, codeRecord.scope);
}

export async function refreshAccessToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: {
    refreshToken: string;
    clientId: string;
    scope?: string;
  }
): Promise<{ data: TokenResponse } | { error: OAuthError; status: number }> {
  const tokenHash = hashKey(params.refreshToken);

  const { data: tokenRecord, error: lookupError } = await db
    .from("oauth_refresh_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .single();

  if (lookupError || !tokenRecord) {
    return {
      error: { error: "invalid_grant", error_description: "Invalid refresh token" },
      status: 400,
    };
  }

  if (tokenRecord.revoked) {
    return {
      error: { error: "invalid_grant", error_description: "Refresh token revoked" },
      status: 400,
    };
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return {
      error: { error: "invalid_grant", error_description: "Refresh token expired" },
      status: 400,
    };
  }

  if (tokenRecord.client_id !== params.clientId) {
    return {
      error: { error: "invalid_grant", error_description: "Client ID mismatch" },
      status: 400,
    };
  }

  // Token rotation: revoke the old refresh token
  await db
    .from("oauth_refresh_tokens")
    .update({ revoked: true })
    .eq("token_hash", tokenHash);

  // Use the original scope unless a narrower scope is requested
  const scope = params.scope || tokenRecord.scope;

  return issueTokens(db, tokenRecord.client_id, tokenRecord.user_id, scope);
}

// ── Issue Tokens (shared) ───────────────────────────────────
async function issueTokens(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  clientId: string,
  userId: string,
  scope: string
): Promise<{ data: TokenResponse }> {
  const accessToken = generateToken(ACCESS_TOKEN_PREFIX);
  const refreshToken = generateToken(REFRESH_TOKEN_PREFIX);

  // Store hashed tokens
  await db.from("oauth_access_tokens").insert({
    token_hash: hashKey(accessToken),
    client_id: clientId,
    user_id: userId,
    scope,
    expires_at: expiresAt(ACCESS_TOKEN_TTL_SECONDS),
  });

  await db.from("oauth_refresh_tokens").insert({
    token_hash: hashKey(refreshToken),
    client_id: clientId,
    user_id: userId,
    scope,
    expires_at: expiresAt(REFRESH_TOKEN_TTL_SECONDS),
  });

  return {
    data: {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope,
    },
  };
}

// ── Verify Access Token (for MCP handler) ───────────────────
export interface OAuthTokenInfo {
  userId: string;
  clientId: string;
  scopes: PermissionScope[];
  permissions: Record<string, boolean>;
}

export async function verifyOAuthAccessToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  rawToken: string
): Promise<OAuthTokenInfo | null> {
  if (!rawToken.startsWith(ACCESS_TOKEN_PREFIX)) return null;

  const tokenHash = hashKey(rawToken);

  const { data: tokenRecord, error } = await db
    .from("oauth_access_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !tokenRecord) return null;

  if (new Date(tokenRecord.expires_at) < new Date()) {
    // Clean up expired token
    db.from("oauth_access_tokens").delete().eq("token_hash", tokenHash).then(() => {});
    return null;
  }

  const scopes = parseScopes(tokenRecord.scope);

  return {
    userId: tokenRecord.user_id,
    clientId: tokenRecord.client_id,
    scopes,
    permissions: scopesToPermissions(scopes),
  };
}

// ── Lookup Client ───────────────────────────────────────────
export async function getClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  clientId: string
): Promise<OAuthClient | null> {
  const { data, error } = await db
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .single();

  if (error || !data) return null;
  return data as OAuthClient;
}

/**
 * Validate that a redirect_uri is registered for the given client.
 */
export function isValidRedirectUri(client: OAuthClient, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri);
}
