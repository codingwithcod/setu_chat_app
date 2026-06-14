import { useEffect, useRef } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  getSessionToken,
  getCurrentSessionId,
} from '@/lib/session-manager';
import { supabase } from '@/lib/supabase';
import type { UserSession } from '@/types';

interface UseRealtimeSessionsOptions {
  /** Called when another device signs in to this account. */
  onNewLogin?: (session: UserSession) => void;
  /** Called when THIS session is revoked from another device. */
  onSessionRevoked: () => void;
}

/**
 * Module-level set to track session IDs we are currently revoking ourselves.
 * Session IDs are added before the delete API call and removed after a delay.
 */
const locallyRevokedIds = new Set<string>();

/**
 * Mark a session ID as being revoked by us (call BEFORE the delete API call).
 * The ID is automatically cleared after 10 seconds.
 */
export function markSessionAsRevoking(sessionId: string) {
  locallyRevokedIds.add(sessionId);
  setTimeout(() => locallyRevokedIds.delete(sessionId), 10_000);
}

/**
 * Flag to globally suppress sign-out from realtime DELETE events.
 * Used during bulk "sign out all others" operations.
 */
let suppressSignOut = false;

export function setSuppressSignOut(value: boolean) {
  suppressSignOut = value;
}

/**
 * Subscribe to real-time changes on user_sessions for the current user.
 *
 * - On INSERT with a different token → new login detected
 * - On DELETE matching current token/ID → session was revoked → sign out
 *
 * Mirrors the web's src/hooks/useRealtimeSessions.ts.
 */
export function useRealtimeSessions({
  onNewLogin,
  onSessionRevoked,
}: UseRealtimeSessionsOptions) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const callbacksRef = useRef({ onNewLogin, onSessionRevoked });

  // Keep callbacks up to date without re-subscribing.
  useEffect(() => {
    callbacksRef.current = { onNewLogin, onSessionRevoked };
  }, [onNewLogin, onSessionRevoked]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`sessions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newSession = payload.new as UserSession;
          const currentToken = getSessionToken();

          // Only fire if the new session has a DIFFERENT token than ours.
          if (!currentToken) return;
          if (newSession.session_token === currentToken) return;

          callbacksRef.current.onNewLogin?.(newSession);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedSession = payload.old as Partial<UserSession>;
          const currentToken = getSessionToken();
          const currentSessionId = getCurrentSessionId();

          // 1. If we are suppressing sign-out (we initiated a bulk revoke), skip.
          if (suppressSignOut) return;

          // 2. If we locally revoked this session by ID, skip.
          if (deletedSession.id && locallyRevokedIds.has(deletedSession.id)) return;

          // 3. If payload.old is empty, we can't determine whose session was deleted.
          if (!deletedSession.session_token && !deletedSession.id) return;

          // 4. Determine if the deleted session is OUR current session.
          let isOurSession = false;

          if (deletedSession.session_token && currentToken) {
            isOurSession = deletedSession.session_token === currentToken;
          } else if (deletedSession.id && currentSessionId) {
            isOurSession = deletedSession.id === currentSessionId;
          }

          if (isOurSession) {
            callbacksRef.current.onSessionRevoked();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
