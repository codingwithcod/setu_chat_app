"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { MessageWithSender } from "@/types";

export function useRealtimeMessages(conversationId: string | null) {
  const { addMessage, updateMessage } = useChatStore();
  const { user } = useAuthStore();

  const handleNewMessage = useCallback(
    (payload: { new: MessageWithSender }) => {
      const newMessage = payload.new;
      if (newMessage.sender_id !== user?.id) {
        // Fetch sender info
        const supabase = createClient();
        supabase
          .from("profiles")
          .select("id, username, first_name, last_name, avatar_url, is_online")
          .eq("id", newMessage.sender_id)
          .single()
          .then(({ data: sender }) => {
            if (sender) {
              addMessage({ ...newMessage, sender } as MessageWithSender);
            }
          });
      }
    },
    [addMessage, user?.id]
  );

  const handleUpdatedMessage = useCallback(
    (payload: { new: MessageWithSender }) => {
      updateMessage(payload.new.id, payload.new);
    },
    [updateMessage]
  );

  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleNewMessage
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleUpdatedMessage
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, handleNewMessage, handleUpdatedMessage]);
}
