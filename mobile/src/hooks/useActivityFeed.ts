import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { CONVERSATIONS_KEY } from '@/hooks/useConversations';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chat';
import { useNotificationStore } from '@/stores/notifications';
import type { ConversationWithDetails, Message } from '@/types';

/** See useThread: unique topic per mount avoids reusing a lingering channel. */
let activitySeq = 0;

function snippet(m: Message): string {
  switch (m.message_type) {
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'audio':
      return '🎙️ Voice message';
    case 'file':
      return '📎 Attachment';
    default:
      return m.content?.trim() || 'New message';
  }
}

/**
 * Populates the in-app Activity feed from realtime message inserts — the live,
 * in-memory model the web's notification store was designed for. Mounted once
 * (in the tabs layout) so it accumulates across the whole app session.
 * Skips your own messages, system rows, and the conversation you're viewing.
 */
export function useActivityFeed() {
  const { session } = useAuth();
  const myId = session?.user.id;
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!myId) return;

    const channel = supabase
      .channel(`mobile-activity:${++activitySeq}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new as Message;
          if (m.sender_id === myId || m.message_type === 'system') return;
          if (useChatStore.getState().activeConversationId === m.conversation_id) return;

          const conv = queryClient
            .getQueryData<ConversationWithDetails[]>(CONVERSATIONS_KEY)
            ?.find((c) => c.id === m.conversation_id);
          const isGroup = conv?.type === 'group';
          const sender = conv?.members?.find((mm) => mm.user_id === m.sender_id)?.profile;
          const senderName =
            [sender?.first_name, sender?.last_name].filter(Boolean).join(' ').trim() ||
            'New message';

          addNotification({
            id: m.id,
            type: isGroup ? 'group' : 'message',
            title: isGroup ? conv?.name || 'Group' : senderName,
            body: isGroup
              ? `${sender?.first_name ?? 'Someone'}: ${snippet(m)}`
              : snippet(m),
            conversationId: m.conversation_id,
            read: false,
            createdAt: m.created_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, queryClient, addNotification]);
}
