import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chat';
import type {
  ConversationWithDetails,
  Message,
  MessageWithSender,
  Profile,
} from '@/types';

export const CONVERSATIONS_KEY = ['conversations'] as const;

/** See useThread: unique topic per mount avoids reusing a lingering channel. */
let sidebarSeq = 0;

type ConvList = ConversationWithDetails[];

function sortByRecent(list: ConvList): ConvList {
  return [...list].sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );
}

/**
 * Live conversation list. Fetches GET /api/conversations once, then keeps the
 * react-query cache fresh via the same Supabase Realtime channels the web uses:
 *   - messages INSERT        → bump conversation, update preview, +unread
 *   - conversations UPDATE    → group name/avatar/description changes
 *   - conversation_members DELETE (me) → removed from a conversation
 *   - profiles UPDATE         → online/last_seen presence dots
 */
export function useConversations() {
  const { session } = useAuth();
  const myId = session?.user.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => api.get<ConvList>('/api/conversations'),
    enabled: !!myId,
  });

  useEffect(() => {
    if (!myId) return;

    const setList = (updater: (prev: ConvList) => ConvList) =>
      queryClient.setQueryData<ConvList>(CONVERSATIONS_KEY, (prev) =>
        prev ? updater(prev) : prev
      );

    const handleNewMessage = (m: Message) => {
      const list = queryClient.getQueryData<ConvList>(CONVERSATIONS_KEY);
      const existing = list?.find((c) => c.id === m.conversation_id);

      if (!existing) {
        // A conversation we don't have yet (someone messaged us for the first
        // time). Fetch the full record and prepend it.
        api
          .get<ConversationWithDetails>(`/api/conversations/${m.conversation_id}`)
          .then((conv) => {
            if (!conv) return;
            const unread = m.sender_id !== myId ? 1 : 0;
            setList((prev) =>
              sortByRecent([
                { ...conv, unread_count: conv.unread_count ?? unread },
                ...prev.filter((c) => c.id !== conv.id),
              ])
            );
          })
          .catch(() => {});
        return;
      }

      setList((prev) =>
        sortByRecent(
          prev.map((c) => {
            if (c.id !== m.conversation_id) return c;
            const senderProfile = c.members?.find(
              (mm) => mm.user_id === m.sender_id
            )?.profile as Profile | undefined;
            const last_message: MessageWithSender = {
              ...m,
              sender: senderProfile ?? ({ id: m.sender_id } as Profile),
            };
            const isActive =
              useChatStore.getState().activeConversationId === c.id;
            const bumpUnread = m.sender_id !== myId && !isActive;
            return {
              ...c,
              last_message,
              last_message_at: m.created_at,
              unread_count: bumpUnread
                ? (c.unread_count ?? 0) + 1
                : c.unread_count,
            };
          })
        )
      );
    };

    // Unique topic per mount: supabase.channel() reuses by topic and
    // removeChannel() drops it only after an async round-trip, so a re-subscribe
    // could grab a still-subscribed channel and throw on postgres_changes.
    const channel = supabase
      .channel(`mobile-sidebar:${++sidebarSeq}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => handleNewMessage(payload.new as Message)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const u = payload.new as Partial<ConversationWithDetails> & { id: string };
          setList((prev) =>
            prev.map((c) =>
              c.id === u.id
                ? {
                    ...c,
                    name: u.name ?? c.name,
                    description: u.description ?? c.description,
                    avatar_url: u.avatar_url ?? c.avatar_url,
                  }
                : c
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${myId}`,
        },
        (payload) => {
          const convId = (payload.old as { conversation_id?: string })
            ?.conversation_id;
          if (convId) setList((prev) => prev.filter((c) => c.id !== convId));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const p = payload.new as Pick<
            Profile,
            'id' | 'is_online' | 'last_seen'
          >;
          setList((prev) => {
            let touched = false;
            const next = prev.map((c) => {
              if (!c.members?.some((mm) => mm.user_id === p.id)) return c;
              touched = true;
              return {
                ...c,
                members: c.members.map((mm) =>
                  mm.user_id === p.id
                    ? {
                        ...mm,
                        profile: {
                          ...mm.profile,
                          is_online: p.is_online,
                          last_seen: p.last_seen,
                        },
                      }
                    : mm
                ),
              };
            });
            return touched ? next : prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, queryClient]);

  return query;
}

/** Mark a conversation read: upsert the receipt and zero its unread badge. */
export async function markConversationRead(
  conversationId: string,
  userId: string,
  queryClient: QueryClient
) {
  const now = new Date().toISOString();
  queryClient.setQueryData<ConvList>(CONVERSATIONS_KEY, (prev) =>
    prev?.map((c) =>
      c.id === conversationId ? { ...c, unread_count: 0 } : c
    )
  );
  try {
    await supabase.from('read_receipts').upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: now,
        delivered_at: now,
      },
      { onConflict: 'conversation_id,user_id' }
    );
  } catch {
    // Non-fatal; the badge already cleared optimistically.
  }
}
