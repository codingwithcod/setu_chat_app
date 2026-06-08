import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { TypingUser } from '@/types';

const SEND_THROTTLE_MS = 2000;
const STOP_DELAY_MS = 3000;
const AUTO_REMOVE_MS = 4000;

/**
 * Typing indicator over the `typing:{conversationId}` broadcast channel.
 * `onType()` is called on each keystroke; it throttles "typing" broadcasts and
 * sends "stop_typing" after a pause. `typingUsers` lists others currently typing.
 */
export function useTyping(conversationId: string, myId: string, myName: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const u = payload as TypingUser;
        if (!u?.user_id || u.user_id === myId) return;
        setTypingUsers((prev) => [
          ...prev.filter((x) => x.user_id !== u.user_id),
          { ...u, timestamp: Date.now() },
        ]);
        clearTimeout(removeTimers.current[u.user_id]);
        removeTimers.current[u.user_id] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((x) => x.user_id !== u.user_id));
        }, AUTO_REMOVE_MS);
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        const uid = (payload as { user_id?: string })?.user_id;
        if (uid) setTypingUsers((prev) => prev.filter((x) => x.user_id !== uid));
      })
      .subscribe();
    channelRef.current = channel;

    const timers = removeTimers.current;
    return () => {
      supabase.removeChannel(channel);
      Object.values(timers).forEach(clearTimeout);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      channelRef.current = null;
    };
  }, [conversationId, myId]);

  const onType = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current > SEND_THROTTLE_MS) {
      lastSentRef.current = now;
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: myId, username: myName, timestamp: now },
      });
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: myId },
      });
      lastSentRef.current = 0;
    }, STOP_DELAY_MS);
  }, [myId, myName]);

  return { typingUsers, onType };
}
