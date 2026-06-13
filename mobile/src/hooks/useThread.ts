import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CONVERSATIONS_KEY } from '@/hooks/useConversations';
import { supabase } from '@/lib/supabase';
import type {
  ConversationMember,
  ConversationWithDetails,
  Message,
  MessageFile,
  MessageReaction,
  MessageStatus,
  MessageWithSender,
  OtherReadReceipt,
  Profile,
  UploadedFileData,
} from '@/types';
import { computeStatus } from '@/lib/receipts';

const LIMIT = 30;
const MEDIA_TYPES = ['image', 'video', 'audio', 'file'];

/**
 * Monotonic suffix for postgres_changes channel topics. `supabase.channel()`
 * REUSES any channel with a matching topic, and `removeChannel()` only drops it
 * from the client after an async server round-trip — so a quick re-subscribe
 * (fast nav, members change, dev fast-refresh) would otherwise grab a still-
 * subscribed channel and `.on('postgres_changes')` throws "after subscribe()".
 * A unique topic per subscription avoids the reuse (topic names don't affect
 * postgres_changes delivery — the binding filter does).
 */
let realtimeSeq = 0;

interface MessagesEnvelope {
  data: MessageWithSender[];
  hasMore: boolean;
  nextCursor: string | null;
  otherReadReceipts: OtherReadReceipt[];
}

function clientId() {
  return `c${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

/**
 * Full chat-thread state for one conversation: paginated history, optimistic
 * send/edit/delete/react, and live updates via the web's channels
 * (`messages:{id}`, `read-receipts:{id}`, `reaction-sync:{id}`).
 * Messages are kept oldest-first.
 */
export function useThread(conversationId: string) {
  const { session, profile } = useAuth();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();

  const [messages, setMessagesState] = useState<MessageWithSender[]>([]);
  const [receipts, setReceiptsState] = useState<OtherReadReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const messagesRef = useRef<MessageWithSender[]>([]);
  const cursorRef = useRef<string | null>(null);
  const reactionChannelRef = useRef<RealtimeChannel | null>(null);

  const setMessages = useCallback(
    (updater: (prev: MessageWithSender[]) => MessageWithSender[]) => {
      setMessagesState((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    []
  );

  const members = useCallback(
    (): (ConversationMember & { profile: Profile })[] =>
      queryClient
        .getQueryData<ConversationWithDetails[]>(CONVERSATIONS_KEY)
        ?.find((c) => c.id === conversationId)?.members ?? [],
    [queryClient, conversationId]
  );

  // ── Initial load ────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getFull<MessagesEnvelope>(
        `/api/conversations/${conversationId}/messages?limit=${LIMIT}`
      )
      .then((res) => {
        if (!active) return;
        setMessages(() => res.data ?? []);
        setReceiptsState(res.otherReadReceipts ?? []);
        cursorRef.current = res.nextCursor;
        setHasMore(!!res.hasMore);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [conversationId, setMessages]);

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || !cursorRef.current) return;
    setLoadingOlder(true);
    try {
      const res = await api.getFull<MessagesEnvelope>(
        `/api/conversations/${conversationId}/messages?limit=${LIMIT}&cursor=${encodeURIComponent(
          cursorRef.current
        )}`
      );
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const older = (res.data ?? []).filter((m) => !existing.has(m.id));
        return [...older, ...prev];
      });
      cursorRef.current = res.nextCursor;
      setHasMore(!!res.hasMore);
    } catch {
      // keep what we have
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMore, loadingOlder, setMessages]);

  // ── Enrich a bare realtime row into a MessageWithSender ──────────
  const enrich = useCallback(
    async (row: Message): Promise<MessageWithSender> => {
      let sender = members().find((m) => m.user_id === row.sender_id)?.profile;
      if (!sender) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url, is_online, last_seen')
          .eq('id', row.sender_id)
          .single();
        sender = (data as Profile) ?? ({ id: row.sender_id } as Profile);
      }
      const msg: MessageWithSender = { ...row, sender };

      if (row.reply_to) {
        const found = messagesRef.current.find((m) => m.id === row.reply_to);
        if (found) msg.reply_message = { ...found, sender: found.sender };
      }
      if (MEDIA_TYPES.includes(row.message_type)) {
        const { data: files } = await supabase
          .from('message_files')
          .select('*')
          .eq('message_id', row.id)
          .order('display_order');
        if (files) msg.files = files;
      }
      return msg;
    },
    [members]
  );

  // ── Realtime: messages + receipts + reactions ───────────────────
  useEffect(() => {
    if (!conversationId || !myId) return;

    const markDelivered = () => {
      const now = new Date().toISOString();
      supabase
        .from('read_receipts')
        .upsert(
          { conversation_id: conversationId, user_id: myId, last_read_at: now, delivered_at: now },
          { onConflict: 'conversation_id,user_id' }
        )
        .then(
          () => {},
          () => {}
        );
    };

    // Unique per subscription so a lingering, already-subscribed channel from a
    // previous mount is never reused (which would throw on postgres_changes).
    const sub = ++realtimeSeq;

    const msgChannel = supabase
      .channel(`messages:${conversationId}:${sub}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as Message;
          if (messagesRef.current.some((m) => m.id === row.id)) return;
          const enriched = await enrich(row);
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            // Replace our own optimistic echo if present.
            if (row.sender_id === myId) {
              const idx = prev.findIndex(
                (m) => m.status === 'sending' && m.content === row.content && m._clientId
              );
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = enriched;
                return copy;
              }
            }
            return [...prev, enriched];
          });
          if (row.sender_id !== myId) markDelivered();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? {
                    ...m,
                    content: row.content,
                    is_edited: row.is_edited,
                    is_deleted: row.is_deleted,
                    updated_at: row.updated_at,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    const receiptChannel = supabase
      .channel(`read-receipts:${conversationId}:${sub}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'read_receipts',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const r = payload.new as OtherReadReceipt & { user_id: string };
          if (!r?.user_id || r.user_id === myId) return;
          setReceiptsState((prev) => {
            const rest = prev.filter((x) => x.user_id !== r.user_id);
            return [...rest, r];
          });
        }
      )
      .subscribe();

    // Broadcast channel — the topic MUST stay stable so it matches the web's
    // sender. Reuse a lingering instance instead of re-binding (which would
    // stack duplicate handlers); broadcast .on/.subscribe don't throw on reuse.
    const reactionTopic = `reaction-sync:${conversationId}`;
    const reactionChannel =
      supabase.getChannels().find((c) => c.topic === `realtime:${reactionTopic}`) ??
      supabase
        .channel(reactionTopic)
        .on('broadcast', { event: 'reaction_update' }, async (payload) => {
          const messageId = (payload.payload as { message_id?: string })?.message_id;
          if (!messageId) return;
          const { data } = await supabase
            .from('message_reactions')
            .select('*')
            .eq('message_id', messageId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, reactions: (data as MessageReaction[]) ?? [] } : m
            )
          );
        })
        .subscribe();
    reactionChannelRef.current = reactionChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(receiptChannel);
      supabase.removeChannel(reactionChannel);
      reactionChannelRef.current = null;
    };
  }, [conversationId, myId, enrich, setMessages]);

  // ── Actions ─────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (
      content: string,
      replyTo?: MessageWithSender | null,
      files?: UploadedFileData[]
    ) => {
      const text = content.trim();
      const hasFiles = !!files && files.length > 0;
      if ((!text && !hasFiles) || !myId) return;
      const cid = clientId();
      const now = new Date().toISOString();
      const messageType = hasFiles ? files![0].file_type : 'text';
      const optimisticFiles: MessageFile[] | undefined = hasFiles
        ? files!.map((f, i) => ({
            id: `tmpf${i}-${cid}`,
            message_id: cid,
            file_url: f.url,
            file_name: f.name,
            file_size: f.size,
            file_type: f.file_type,
            mime_type: f.mime_type,
            display_order: i,
            created_at: now,
          }))
        : undefined;
      const optimistic: MessageWithSender = {
        id: cid,
        _clientId: cid,
        conversation_id: conversationId,
        sender_id: myId,
        content: text || null,
        message_type: messageType,
        reply_to: replyTo?.id ?? null,
        forwarded_from: null,
        is_edited: false,
        is_deleted: false,
        created_at: now,
        updated_at: now,
        sender: (profile as Profile) ?? ({ id: myId } as Profile),
        status: 'sending',
        reply_message: replyTo ? { ...replyTo, sender: replyTo.sender } : undefined,
        files: optimisticFiles,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const server = await api.post<MessageWithSender>(
          `/api/conversations/${conversationId}/messages`,
          {
            content: text || null,
            message_type: messageType,
            reply_to: replyTo?.id ?? undefined,
            files: hasFiles ? files : undefined,
          }
        );
        setMessages((prev) => {
          if (prev.some((m) => m.id === server.id)) {
            return prev.filter((m) => m._clientId !== cid);
          }
          return prev.map((m) =>
            m._clientId === cid
              ? {
                  ...server,
                  status: undefined,
                  // The POST response omits the nested reply/forward objects
                  // (only the ids) — keep the ones from the optimistic message
                  // so the reply preview doesn't vanish after sending.
                  reply_message: server.reply_message ?? m.reply_message,
                  forwarded_message: server.forwarded_message ?? m.forwarded_message,
                }
              : m
          );
        });
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m._clientId === cid ? { ...m, status: 'failed' } : m))
        );
      }
    },
    [conversationId, myId, profile, setMessages]
  );

  const retryMessage = useCallback(
    async (cid: string) => {
      const msg = messagesRef.current.find((m) => m._clientId === cid);
      if (!msg || msg.status !== 'failed') return;
      setMessages((prev) =>
        prev.map((m) => (m._clientId === cid ? { ...m, status: 'sending' } : m))
      );
      try {
        const server = await api.post<MessageWithSender>(
          `/api/conversations/${conversationId}/messages`,
          { content: msg.content ?? '', reply_to: msg.reply_to ?? undefined }
        );
        setMessages((prev) => {
          if (prev.some((m) => m.id === server.id)) {
            return prev.filter((m) => m._clientId !== cid);
          }
          return prev.map((m) =>
            m._clientId === cid
              ? {
                  ...server,
                  status: undefined,
                  reply_message: server.reply_message ?? m.reply_message,
                  forwarded_message: server.forwarded_message ?? m.forwarded_message,
                }
              : m
          );
        });
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m._clientId === cid ? { ...m, status: 'failed' } : m))
        );
      }
    },
    [conversationId, setMessages]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const text = content.trim();
      if (!text) return;
      const before = messagesRef.current.find((m) => m.id === messageId)?.content;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: text, is_edited: true } : m
        )
      );
      try {
        await api.patch(`/api/messages/${messageId}`, { content: text });
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: before ?? m.content } : m))
        );
      }
    },
    [setMessages]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const before = messagesRef.current.find((m) => m.id === messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_deleted: true, content: null } : m
        )
      );
      try {
        await api.del(`/api/messages/${messageId}`);
      } catch {
        if (before) {
          setMessages((prev) => prev.map((m) => (m.id === messageId ? before : m)));
        }
      }
    },
    [setMessages]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const list = m.reactions ?? [];
          const mine = list.find((r) => r.user_id === myId && r.reaction === emoji);
          const reactions = mine
            ? list.filter((r) => !(r.user_id === myId && r.reaction === emoji))
            : [
                ...list,
                {
                  id: `tmp${Math.random()}`,
                  message_id: messageId,
                  user_id: myId,
                  reaction: emoji,
                  created_at: new Date().toISOString(),
                } as MessageReaction,
              ];
          return { ...m, reactions };
        })
      );
      try {
        await api.post(`/api/messages/${messageId}/reactions`, { reaction: emoji });
        reactionChannelRef.current?.send({
          type: 'broadcast',
          event: 'reaction_update',
          payload: { message_id: messageId },
        });
      } catch {
        // refetch truth on failure
        const { data } = await supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', messageId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, reactions: (data as MessageReaction[]) ?? [] } : m
          )
        );
      }
    },
    [myId, setMessages]
  );

  const statusFor = useCallback(
    (message: MessageWithSender): MessageStatus =>
      computeStatus(message, receipts, members(), myId),
    [receipts, myId, members]
  );

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    loadOlder,
    sendMessage,
    retryMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    statusFor,
    myId,
  };
}
