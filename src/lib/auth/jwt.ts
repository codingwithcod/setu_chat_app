import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Pure, edge-safe Supabase access-token verification.
 *
 * This module deliberately imports NOTHING from `next/headers` or the Supabase
 * server client, so it can be used from both Node route handlers AND Edge
 * middleware. The cookie-reading convenience wrapper (`getAuthUser`) lives in
 * `verify-token.ts`, which is Node-only.
 *
 * Verification strategy (tried in order):
 *   1. **JWKS (asymmetric ES256)** — used by Supabase Cloud. The JWKS set is
 *      fetched once and cached at module scope.
 *   2. **Symmetric HS256** — used by self-hosted Supabase, which signs JWTs
 *      with the `JWT_SECRET` from its `.env`. Set `SUPABASE_JWT_SECRET` in the
 *      app's env to enable this path.
 *
 * This dual-strategy makes the same codebase deployable on both Vercel
 * (Supabase Cloud) and self-hosted Docker (EC2, etc.) without code changes.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

// Self-hosted Supabase uses HS256 with a symmetric secret. The JWKS endpoint
// returns {"keys":[]} in that case, so we fall back to this.
const SYMMETRIC_SECRET = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null;

export interface AuthUser {
  userId: string;
  email?: string;
  claims: JWTPayload;
}

const VERIFY_OPTIONS = {
  issuer: `${SUPABASE_URL}/auth/v1`,
  audience: "authenticated",
} as const;

/** Extract an AuthUser from a verified JWT payload, or null. */
function toAuthUser(payload: JWTPayload): AuthUser | null {
  if (!payload.sub) return null;
  return {
    userId: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    claims: payload,
  };
}

/**
 * Verify a raw access token locally. Returns the authenticated user, or null if
 * the token is missing, malformed, expired, or fails signature/claim checks.
 */
export async function verifyAccessToken(
  token: string | undefined | null
): Promise<AuthUser | null> {
  if (!token) return null;

  // 1. Try JWKS (Supabase Cloud — asymmetric ES256)
  try {
    const { payload } = await jwtVerify(token, JWKS, VERIFY_OPTIONS);
    return toAuthUser(payload);
  } catch {
    // JWKS verification failed — could be empty keys (self-hosted) or
    // invalid token. Fall through to symmetric check.
  }

  // 2. Fallback: HS256 with symmetric JWT_SECRET (self-hosted Supabase)
  if (SYMMETRIC_SECRET) {
    try {
      const { payload } = await jwtVerify(
        token,
        SYMMETRIC_SECRET,
        VERIFY_OPTIONS
      );
      return toAuthUser(payload);
    } catch {
      // Invalid signature, expired, wrong issuer/audience, or malformed.
      return null;
    }
  }

  return null;
}
