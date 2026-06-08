"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Returns a counter that increments whenever the auth token is renewed —
 * on sign-in and on the hourly token refresh.
 *
 * Realtime `postgres_changes` subscriptions evaluate RLS using the token the
 * channel was joined with. Once that token expires, the server silently stops
 * delivering matching changes to that channel — the symptom being a long-lived
 * session that "stops receiving messages until you log out and back in".
 * Calling `realtime.setAuth()` updates the socket token but does NOT reliably
 * resume delivery on a channel that already went stale; the channel must be
 * re-joined. So realtime hooks include this value in their effect deps: when
 * the token changes, the effect tears down and re-subscribes its channels with
 * the fresh token, guaranteeing delivery continues for the life of the session.
 *
 * Note: `INITIAL_SESSION` is intentionally ignored so a normal page load with
 * an existing session does NOT cause an extra re-subscribe on mount.
 */
export function useRealtimeAuthVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        supabase.realtime.setAuth(session?.access_token ?? null);
        setVersion((v) => v + 1);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return version;
}
