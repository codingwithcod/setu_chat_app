"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { getSessionToken, getCurrentSessionId } from "@/lib/session-manager";
import type { UserSession } from "@/types";

interface UseRealtimeSessionsOptions {
  onNewLogin: (session: UserSession) => void;
  onSessionRevoked: () => void;
}

/**
 * Subscribe to real-time changes on user_sessions for the current user.
 * - On INSERT with a different token → new login detected → show banner
 * - On DELETE matching current token/ID → session was revoked → sign out
 *
 * IMPORTANT: We read the session token INSIDE callbacks (not at subscription time)
 * because the token might not exist in localStorage yet when the subscription starts.
 */
export function useRealtimeSessions({
  onNewLogin,
  onSessionRevoked,
}: UseRealtimeSessionsOptions) {
  const user = useAuthStore((s) => s.user);
  const callbacksRef = useRef({ onNewLogin, onSessionRevoked });

  // Keep callbacks up to date
  useEffect(() => {
    callbacksRef.current = { onNewLogin, onSessionRevoked };
  }, [onNewLogin, onSessionRevoked]);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`sessions:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_sessions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newSession = payload.new as UserSession;
          // Read token at callback time — NOT at subscription time
          const currentToken = getSessionToken();
          if (currentToken && newSession.session_token !== currentToken) {
            callbacksRef.current.onNewLogin(newSession);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "user_sessions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedSession = payload.old as Partial<UserSession>;
          // Read token/ID at callback time
          const currentToken = getSessionToken();
          const currentSessionId = getCurrentSessionId();

          const isOurSession =
            (deletedSession.session_token &&
              deletedSession.session_token === currentToken) ||
            (deletedSession.id && deletedSession.id === currentSessionId);

          if (isOurSession) {
            callbacksRef.current.onSessionRevoked();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}

