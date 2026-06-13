import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttachmentMenu } from '@/components/chat/AttachmentMenu';
import { DateSeparator } from '@/components/chat/DateSeparator';
import { ForwardMessageModal } from '@/components/chat/ForwardMessageModal';
import { MessageActionSheet } from '@/components/chat/MessageActionSheet';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { MAX_FILE_MB, uploadAsset, type PickedAsset } from '@/lib/media';
import { Avatar } from '@/components/ui/Avatar';
import { useDialog } from '@/components/ui/DialogProvider';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { ThreadSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import {
  CONVERSATIONS_KEY,
  markConversationRead,
} from '@/hooks/useConversations';
import { useThread } from '@/hooks/useThread';
import { useTyping } from '@/hooks/useTyping';
import { conversationDisplay, otherMember } from '@/lib/conversation-display';
import { formatLastSeen, isDifferentDay } from '@/lib/time';
import { useChatStore } from '@/stores/chat';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConversationWithDetails, MessageWithSender } from '@/types';

type Row =
  | { kind: 'date'; id: string; iso: string }
  | {
      kind: 'message';
      id: string;
      message: MessageWithSender;
      showSender: boolean;
      grouped: boolean;
    };

export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? '';
  const { session, profile } = useAuth();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const conversation = queryClient
    .getQueryData<ConversationWithDetails[]>(CONVERSATIONS_KEY)
    ?.find((c) => c.id === conversationId);
  const display = conversation ? conversationDisplay(conversation, myId) : null;
  const isGroup = display?.isGroup ?? false;

  const {
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
  } = useThread(conversationId);

  const myName = profile?.first_name || 'Someone';
  const { typingUsers, onType } = useTyping(conversationId, myId, myName);

  const [replyingTo, setReplyingTo] = useState<MessageWithSender | null>(null);
  const [editing, setEditing] = useState<MessageWithSender | null>(null);
  const [staged, setStaged] = useState<PickedAsset[]>([]);
  const [attachMenu, setAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onPicked = useCallback((assets: PickedAsset[], tooLarge: string[]) => {
    if (assets.length) setStaged((prev) => [...prev, ...assets].slice(0, 10));
    if (tooLarge.length) {
      dialog.alert({
        title: 'File too large',
        message: `These exceed the ${MAX_FILE_MB} MB limit and were skipped:\n${tooLarge.join('\n')}`,
        icon: 'alert-circle-outline',
      });
    }
  }, [dialog]);

  const handleSend = useCallback(
    async (text: string) => {
      const reply = replyingTo;
      if (staged.length > 0) {
        const toUpload = staged;
        setUploading(true);
        try {
          const uploaded = await Promise.all(toUpload.map(uploadAsset));
          setStaged([]);
          setReplyingTo(null);
          await sendMessage(text, reply, uploaded);
        } catch (err) {
          const detail =
            err instanceof Error ? err.message : 'Please try again.';
          dialog.alert({ title: 'Upload failed', message: detail, icon: 'alert-circle-outline' });
        } finally {
          setUploading(false);
        }
      } else {
        setReplyingTo(null);
        sendMessage(text, reply);
      }
    },
    [staged, replyingTo, sendMessage, dialog]
  );
  const [actionMsg, setActionMsg] = useState<MessageWithSender | null>(null);
  const [forwardMsg, setForwardMsg] = useState<MessageWithSender | null>(null);

  const listRef = useRef<FlashListRef<Row>>(null);
  const nearBottomRef = useRef(true);
  const lastIdRef = useRef<string | null>(null);

  // Mark active + read on open.
  useEffect(() => {
    if (!conversationId) return;
    setActiveConversation(conversationId);
    if (myId) markConversationRead(conversationId, myId, queryClient);
    return () => setActiveConversation(null);
  }, [conversationId, myId, queryClient, setActiveConversation]);

  // Build rows with date separators + group sender labels.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let prev: MessageWithSender | null = null;
    for (const m of messages) {
      const newDay = !prev || isDifferentDay(prev.created_at, m.created_at);
      if (newDay) {
        out.push({ kind: 'date', id: `date-${m.id}`, iso: m.created_at });
      }
      const showSender =
        isGroup && m.sender_id !== myId && prev?.sender_id !== m.sender_id;
      // Continuation: same sender, same day, within 4 minutes of the previous.
      const grouped =
        !!prev &&
        !newDay &&
        prev.sender_id === m.sender_id &&
        new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 4 * 60 * 1000;
      out.push({ kind: 'message', id: m._clientId ?? m.id, message: m, showSender, grouped });
      prev = m;
    }
    return out;
  }, [messages, isGroup, myId]);

  // Send/receive pop: spring fresh messages in, but never the existing history
  // or older paginated messages. We seed a "newest seen" timestamp on first
  // load; only messages newer than that (and not yet popped) animate.
  const poppedRef = useRef<Set<string>>(new Set());
  const newestSeenRef = useRef<number>(0);
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && messages.length) {
      newestSeenRef.current = messages.reduce(
        (mx, m) => Math.max(mx, new Date(m.created_at).getTime()),
        0
      );
      seededRef.current = true;
    }
  }, [messages]);

  // Auto-scroll to bottom on new messages (mine always; others if near bottom).
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const changed = last.id !== lastIdRef.current;
    lastIdRef.current = last.id;
    if (!changed) return;
    if (last.sender_id === myId || nearBottomRef.current) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages, myId]);

  const onScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    nearBottomRef.current =
      contentSize.height - (contentOffset.y + layoutMeasurement.height) < 120;
  }, []);

  const confirmDelete = useCallback(
    (m: MessageWithSender) => deleteMessage(m.id),
    [deleteMessage]
  );

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'date') return <DateSeparator iso={item.iso} />;
      const m = item.message;
      // Pop in only genuinely-new messages (each at most once).
      const t = new Date(m.created_at).getTime();
      let animateIn = false;
      if (seededRef.current && t > newestSeenRef.current && !poppedRef.current.has(item.id)) {
        animateIn = true;
        poppedRef.current.add(item.id);
      }
      return (
        <MessageBubble
          message={m}
          isOwn={m.sender_id === myId}
          showSender={item.showSender}
          grouped={item.grouped}
          animateIn={animateIn}
          status={statusFor(m)}
          myId={myId}
          onLongPress={setActionMsg}
          onToggleReaction={toggleReaction}
          onRetry={(msg) => msg._clientId && retryMessage(msg._clientId)}
        />
      );
    },
    [myId, statusFor, toggleReaction, retryMessage]
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Touchable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Touchable>
        <Touchable
          style={styles.headerInfo}
          haptic="none"
          onPress={() => {
            if (isGroup) {
              router.push(`/group/${conversationId}`);
            } else if (conversation && !display?.isSelf) {
              const other = otherMember(conversation, myId);
              if (other)
                router.push(`/profile/${other.user_id}?conversationId=${conversationId}`);
            }
          }}
        >
          <Avatar uri={display?.avatarUri} name={display?.title} size={40} online={display?.online} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {display?.title ?? 'Chat'}
            </Text>
            {typingUsers.length > 0 ? (
              <Text style={[styles.subtitle, { color: colors.primary }]}>typing…</Text>
            ) : display && !display.isGroup && !display.isSelf ? (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {display.online
                  ? 'online'
                  : formatLastSeen(
                      conversation?.members?.find((m) => m.user_id !== myId)?.profile?.last_seen
                    )}
              </Text>
            ) : isGroup ? (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {conversation?.members?.length ?? 0} members · tap for info
              </Text>
            ) : null}
          </View>
        </Touchable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.flex}>
            <ThreadSkeleton />
          </View>
        ) : rows.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(320)} style={[styles.flex, styles.empty]}>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              No messages yet. Start the conversation! 👋
            </Text>
            <Touchable
              onPress={() => handleSend('👋')}
              style={[styles.sayHiShadow, { shadowColor: colors.primary }]}
            >
              <LinearGradient
                colors={colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sayHiBorder}
              >
                <View style={[styles.sayHiInner, { backgroundColor: colors.card }]}>
                  <Text style={[styles.sayHiText, { color: colors.foreground }]}>
                    Say Hi 👋
                  </Text>
                </View>
              </LinearGradient>
            </Touchable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(260)} style={styles.flex}>
            <FlashList
              ref={listRef}
              data={rows}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              onScroll={onScroll}
              scrollEventThrottle={64}
              onStartReached={hasMore ? loadOlder : undefined}
              onStartReachedThreshold={0.3}
              ListHeaderComponent={
                loadingOlder ? (
                  <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primary} />
                ) : null
              }
              contentContainerStyle={{ paddingVertical: 8 }}
              keyboardDismissMode="interactive"
            />
          </Animated.View>
        )}

        <TypingIndicator users={typingUsers} />

        <View style={{ paddingBottom: insets.bottom }}>
          <MessageInput
            onSend={handleSend}
            onType={onType}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onConfirmEdit={(text) => {
              if (editing) editMessage(editing.id, text);
              setEditing(null);
            }}
            onAttach={() => setAttachMenu(true)}
            attachments={staged}
            onRemoveAttachment={(i) =>
              setStaged((prev) => prev.filter((_, idx) => idx !== i))
            }
            uploading={uploading}
          />
        </View>
      </KeyboardAvoidingView>

      <AttachmentMenu
        visible={attachMenu}
        onClose={() => setAttachMenu(false)}
        onPicked={onPicked}
      />

      <MessageActionSheet
        message={actionMsg}
        isOwn={actionMsg?.sender_id === myId}
        onClose={() => setActionMsg(null)}
        onReply={(m) => setReplyingTo(m)}
        onReact={toggleReaction}
        onEdit={(m) => setEditing(m)}
        onDelete={confirmDelete}
        onForward={(m) => setForwardMsg(m)}
      />

      <ForwardMessageModal message={forwardMsg} onClose={() => setForwardMsg(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  emptySubtitle: { fontSize: 14.5, textAlign: 'center', lineHeight: 21 },
  sayHiShadow: {
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  sayHiBorder: { borderRadius: 999, padding: 1.5 },
  sayHiInner: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24 },
  sayHiText: { fontSize: 14, fontWeight: '700' },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 16,
  },
  back: { paddingHorizontal: 8, height: '100%', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 13 },
});
