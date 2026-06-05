import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifyAccessToken, type AuthUser } from "@/lib/auth/jwt";

/**
 * Node-only convenience wrapper around the edge-safe verifier in `./jwt`.
 *
 * Resolves the access token from one of two transports, then verifies it
 * locally (local — `getSession` only hits the network when it must refresh an
 * expired token). This is the drop-in replacement for the
 * `supabase.auth.getUser()` 401 guard on hot routes:
 *
 *   const auth = await getAuthUser();
 *   if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   // use auth.userId instead of user.id
 *
 * Transports, in order:
 *   1. `Authorization: Bearer <token>` header — used by the React Native mobile
 *      app, which has no cookie jar and carries the Supabase access token
 *      explicitly. Verified by the same local JWKS check as the web path.
 *   2. Supabase SSR cookies — used by the web (Next.js) and Tauri desktop
 *      clients. Unchanged behavior.
 *
 * Trade-off: a locally-verified token stays valid until it expires (~1h), so a
 * server-side revocation is NOT seen immediately here. Use this ONLY on hot,
 * low-risk routes. Sensitive/destructive actions must keep `getUser()`.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  // 1. Bearer header (mobile). Cheaper than touching cookies, so try it first.
  const authorization = (await headers()).get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const bearer = await verifyAccessToken(authorization.slice(7).trim());
    if (bearer) return bearer;
  }

  // 2. Cookie session (web / desktop).
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return verifyAccessToken(session?.access_token);
}

export { verifyAccessToken };
export type { AuthUser };
