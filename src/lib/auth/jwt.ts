import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Pure, edge-safe Supabase access-token verification.
 *
 * This module deliberately imports NOTHING from `next/headers` or the Supabase
 * server client, so it can be used from both Node route handlers AND Edge
 * middleware. The cookie-reading convenience wrapper (`getAuthUser`) lives in
 * `verify-token.ts`, which is Node-only.
 *
 * Verification is local: the JWT signature is checked against the project's
 * public JWKS (the project uses asymmetric ES256 signing keys). The JWKS set is
 * created ONCE at module scope so its key cache persists across requests — after
 * the first fetch, verification needs no network call.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export interface AuthUser {
  userId: string;
  email?: string;
  claims: JWTPayload;
}

/**
 * Verify a raw access token locally. Returns the authenticated user, or null if
 * the token is missing, malformed, expired, or fails signature/claim checks.
 */
export async function verifyAccessToken(
  token: string | undefined | null
): Promise<AuthUser | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      // Supabase access tokens are issued by <project>/auth/v1 for the
      // "authenticated" audience. jwtVerify also checks the signature and exp.
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: "authenticated",
    });

    if (!payload.sub) return null;

    return {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      claims: payload,
    };
  } catch {
    // Invalid signature, expired, wrong issuer/audience, or malformed token.
    return null;
  }
}
