import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Keep the Realtime socket's auth token in sync with the session.
  //
  // Realtime evaluates RLS on every change event using the token the socket was
  // opened with. If that token becomes stale — most notably when the project's
  // JWT signing keys rotate (e.g. legacy HS256 → asymmetric ES256) — the server
  // can no longer authorize it, so postgres_changes events are silently dropped
  // even though the channel still reports SUBSCRIBED. The symptom is a sidebar
  // that only updates after a manual re-login.
  //
  // Re-authenticating the socket on every auth change (initial session, sign-in,
  // and the hourly token refresh) guarantees Realtime always uses a currently
  // valid token, so no user ever has to log out and back in to receive events.
  const c = client;
  c.auth.onAuthStateChange((_event, session) => {
    c.realtime.setAuth(session?.access_token ?? null);
  });

  return client;
}
