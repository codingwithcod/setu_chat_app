import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserRow } from '@/components/contacts/UserRow';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { useAuth } from '@/context/AuthContext';
import { CONVERSATIONS_KEY } from '@/hooks/useConversations';
import { useUserSearch } from '@/hooks/useUsers';
import { conversationDisplay } from '@/lib/conversation-display';
import { forwardMessage } from '@/lib/conversation-actions';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConversationWithDetails, MessageWithSender, SearchResult } from '@/types';

interface ForwardMessageModalProps {
  message: MessageWithSender | null;
  onClose: () => void;
}

type Row =
  | { kind: 'conversation'; id: string; conv: ConversationWithDetails }
  | { kind: 'user'; id: string; user: SearchResult };

function previewText(m: MessageWithSender): string {
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
      return m.content?.trim() || '';
  }
}

export function ForwardMessageModal({ message, onClose }: ForwardMessageModalProps) {
  const { colors, radius } = useTheme();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';

  const [query, setQuery] = useState('');
  const [convIds, setConvIds] = useState<Set<string>>(new Set());
  const [userIds, setUserIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const search = useUserSearch(query);

  const conversations = useMemo(
    () => queryClient.getQueryData<ConversationWithDetails[]>(CONVERSATIONS_KEY) ?? [],
    [queryClient]
  );

  // Build the picker rows: existing conversations (filtered by title) + user
  // search results (excluding users already reachable via a listed conversation).
  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const convRows: Row[] = conversations
      .filter((c) => {
        if (!q) return true;
        return conversationDisplay(c, myId).title.toLowerCase().includes(q);
      })
      .map((c) => ({ kind: 'conversation' as const, id: c.id, conv: c }));

    const memberUserIds = new Set(
      conversations.flatMap((c) =>
        c.type === 'private' ? c.members.map((m) => m.user_id) : []
      )
    );
    const userRows: Row[] = search.results
      .filter((u) => u.id !== myId && !memberUserIds.has(u.id))
      .map((u) => ({ kind: 'user' as const, id: u.id, user: u }));

    return [...convRows, ...userRows];
  }, [conversations, search.results, query, myId]);

  const totalSelected = convIds.size + userIds.size;

  const reset = useCallback(() => {
    setQuery('');
    setConvIds(new Set());
    setUserIds(new Set());
    setSending(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const toggleConv = useCallback((id: string) => {
    setConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleUser = useCallback((id: string) => {
    setUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const send = useCallback(async () => {
    if (!message || totalSelected === 0) return;
    setSending(true);
    try {
      await forwardMessage(
        message.id,
        { conversationIds: [...convIds], userIds: [...userIds] },
        queryClient
      );
      close();
    } catch (err) {
      setSending(false);
      dialog.alert({
        title: 'Forward failed',
        message: err instanceof Error ? err.message : 'Please try again.',
        icon: 'alert-circle-outline',
      });
    }
  }, [message, totalSelected, convIds, userIds, queryClient, close, dialog]);

  const Checkbox = ({ checked }: { checked: boolean }) => (
    <View
      style={[
        styles.check,
        {
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : 'transparent',
        },
      ]}
    >
      {checked && <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />}
    </View>
  );

  const renderRow = ({ item }: { item: Row }) => {
    {
      if (item.kind === 'user') {
        return (
          <UserRow
            user={item.user}
            onPress={() => toggleUser(item.id)}
            right={<Checkbox checked={userIds.has(item.id)} />}
          />
        );
      }
      const d = conversationDisplay(item.conv, myId);
      const checked = convIds.has(item.id);
      return (
        <Pressable
          onPress={() => toggleConv(item.id)}
          style={({ pressed }) => [
            styles.convRow,
            { backgroundColor: pressed ? colors.secondary : 'transparent' },
          ]}
        >
          {d.isSelf ? (
            <View style={[styles.iconAvatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="bookmark" size={22} color={colors.primaryForeground} />
            </View>
          ) : d.isGroup && !d.avatarUri ? (
            <View style={[styles.iconAvatar, { backgroundColor: colors.accent }]}>
              <Ionicons name="people" size={22} color={colors.primary} />
            </View>
          ) : (
            <Avatar uri={d.avatarUri} name={d.title} size={48} online={d.online} />
          )}
          <View style={styles.convMiddle}>
            <Text style={[styles.convTitle, { color: colors.foreground }]} numberOfLines={1}>
              {d.title}
            </Text>
            <Text style={[styles.convSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {d.isSelf ? 'Saved Messages' : d.isGroup ? 'Group' : 'Direct message'}
            </Text>
          </View>
          <Checkbox checked={checked} />
        </Pressable>
      );
    }
  };

  return (
    <Modal
      visible={!!message}
      animationType="slide"
      onRequestClose={close}
      transparent={false}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={close} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Forward to…</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Message preview */}
        {message && (
          <View style={[styles.preview, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.md }]}>
            <Ionicons name="arrow-redo-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.previewText, { color: colors.foreground }]} numberOfLines={2}>
              {previewText(message) || 'Message'}
            </Text>
          </View>
        )}

        {/* Search */}
        <View
          style={[
            styles.searchField,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats and people"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={renderRow}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            search.loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {query ? 'No chats or people found' : 'No conversations yet'}
              </Text>
            )
          }
        />

        <View style={{ padding: 16, paddingBottom: insets.bottom + 12 }}>
          <Button
            label={totalSelected > 0 ? `Forward (${totalSelected})` : 'Forward'}
            onPress={send}
            disabled={totalSelected === 0 || sending}
            loading={sending}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewText: { flex: 1, fontSize: 14 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    margin: 16,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15.5, height: '100%' },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convMiddle: { flex: 1, gap: 2 },
  convTitle: { fontSize: 16, fontWeight: '700' },
  convSub: { fontSize: 13 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', paddingTop: 40 },
  hint: { fontSize: 14, textAlign: 'center', paddingTop: 30 },
});
