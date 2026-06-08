import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence';
import { supabase } from '@/lib/supabase';

/**
 * Keeps the current user's presence fresh: marks online on mount and every
 * heartbeat, offline when backgrounded/unmounted. Mirrors the web heartbeat so
 * other users see an accurate online dot.
 */
export function usePresenceHeartbeat() {
  const { session } = useAuth();
  const myId = session?.user.id;

  useEffect(() => {
    if (!myId) return;

    const setPresence = (online: boolean) => {
      supabase
        .from('profiles')
        .update({ is_online: online, last_seen: new Date().toISOString() })
        .eq('id', myId)
        .then(
          () => {},
          () => {}
        );
    };

    setPresence(true);
    const interval = setInterval(() => setPresence(true), PRESENCE_HEARTBEAT_MS);
    const sub = AppState.addEventListener('change', (state) =>
      setPresence(state === 'active')
    );

    return () => {
      clearInterval(interval);
      sub.remove();
      setPresence(false);
    };
  }, [myId]);
}
