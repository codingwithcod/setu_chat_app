import { createClient } from "@/lib/supabase/server";
import { verifyAccessToken, type AuthUser } from "@/lib/auth/jwt";

/**
 * Node-only convenience wrapper around the edge-safe verifier in `./jwt`.
 *
 * Reads the access token from the request cookies (local — `getSession` only
 * hits the network when it must refresh an expired token) and verifies it
 * locally. This is the drop-in replacement for the `supabase.auth.getUser()`
 * 401 guard on hot routes:
 *
 *   const auth = await getAuthUser();
 *   if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   // use auth.userId instead of user.id
 *
 * Trade-off: a locally-verified token stays valid until it expires (~1h), so a
 * server-side revocation is NOT seen immediately here. Use this ONLY on hot,
 * low-risk routes. Sensitive/destructive actions must keep `getUser()`.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return verifyAccessToken(session?.access_token);
}

export { verifyAccessToken };
export type { AuthUser };
