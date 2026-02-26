"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import type { ConversationWithDetails, MessageWithSender } from "@/types";

/**
 * Subscribes to realtime changes to keep the sidebar conversation list
 * up-to-date. Conversations only appear for the other user when the
 * first message is sent (not when the conversation is created).
 */
export function useRealtimeConversations() {
  const { user } = useAuthStore();
  const addConversation = useChatStore((state) => state.addConversation);
  const updateConversation = useChatStore((state) => state.updateConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);
  const incrementUnreadCount = useChatStore(
    (state) => state.incrementUnreadCount
  );
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const supabase = createClient();

    // Listen for when user is removed from a conversation
    const membersChannel = supabase
      .channel("realtime-conversation-members")
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          removeConversation(payload.old.conversation_id);
        }
      )
      .subscribe();

    // Listen for conversation metadata updates (name, avatar, etc.)
    const conversationsChannel = supabase
      .channel("realtime-conversations")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          const updated = payload.new;
          const existingConversations =
            useChatStore.getState().conversations;
          if (existingConversations.some((c) => c.id === updated.id)) {
            updateConversation(updated.id, {
              last_message_at: updated.last_message_at,
              name: updated.name,
              description: updated.description,
              avatar_url: updated.avatar_url,
            });
          }
        }
      )
      .subscribe();

    // Listen for new messages — this is the primary driver for sidebar updates.
    // When a new message arrives:
    //   - If conversation is already in sidebar → update last_message preview + increment unread
    //   - If conversation is NOT in sidebar → fetch full conversation and add it (this handles
    //     the case where someone else starts a new chat with you)
    const messagesChannel = supabase
      .channel("realtime-sidebar-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new;
          const currentUserId = userIdRef.current;
          const existingConversations =
            useChatStore.getState().conversations;
          const conversation = existingConversations.find(
            (c) => c.id === newMessage.conversation_id
          );

          // Fetch sender info for the last message preview
          const { data: sender } = await supabase
            .from("profiles")
            .select("id, username, first_name, last_name, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();

          if (conversation) {
            // Conversation exists in sidebar — update last message preview
            updateConversation(newMessage.conversation_id, {
              last_message: {
                ...newMessage,
                sender: sender || undefined,
              } as MessageWithSender,
              last_message_at: newMessage.created_at,
            } as Partial<ConversationWithDetails>);

            // Increment unread count if the message is from someone else
            // and this conversation is NOT the active one
            const activeConversation =
              useChatStore.getState().activeConversation;
            if (
              newMessage.sender_id !== currentUserId &&
              activeConversation?.id !== newMessage.conversation_id
            ) {
              incrementUnreadCount(newMessage.conversation_id);
            }
          } else {
            // Conversation NOT in sidebar — this means someone started a new
            // chat with us. Only add it now (on first message, not on creation).
            // First check if we're actually a member of this conversation
            try {
              const res = await fetch(
                `/api/conversations/${newMessage.conversation_id}`
              );
              const data = await res.json();
              if (data.data) {
                const newConv = data.data as ConversationWithDetails;
                // Set last message and unread count
                newConv.last_message = {
                  ...newMessage,
                  sender: sender || undefined,
                } as MessageWithSender;
                if (newMessage.sender_id !== currentUserId) {
                  newConv.unread_count = 1;
                }
                addConversation(newConv);
              }
            } catch (error) {
              console.error("Failed to fetch new conversation:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [
    user?.id,
    addConversation,
    updateConversation,
    removeConversation,
    incrementUnreadCount,
  ]);
}
