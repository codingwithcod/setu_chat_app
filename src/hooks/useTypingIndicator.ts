"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function useTypingIndicator(conversationId: string | null) {
  const { typingUsers, addTypingUser, removeTypingUser, setTypingUsers } =
    useChatStore();
  const { user } = useAuthStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]>>();

  // Send typing status
  const sendTyping = useCallback(() => {
    if (!conversationId || !user || !channelRef.current) return;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: user.id,
        username: user.username || user.first_name,
        timestamp: Date.now(),
      },
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to send stop typing
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "stop_typing",
        payload: { user_id: user.id },
      });
    }, 3000);
  }, [conversationId, user]);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id !== user?.id) {
          addTypingUser(payload);

          // Auto-remove after 4 seconds
          setTimeout(() => {
            removeTypingUser(payload.user_id);
          }, 4000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        removeTypingUser(payload.user_id);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      setTypingUsers([]);
    };
  }, [
    conversationId,
    user?.id,
    addTypingUser,
    removeTypingUser,
    setTypingUsers,
  ]);

  return { typingUsers, sendTyping };
}
