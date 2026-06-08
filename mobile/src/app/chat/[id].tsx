import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComingSoon } from '@/components/ComingSoon';
import { Avatar } from '@/components/ui/Avatar';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import {
  CONVERSATIONS_KEY,
  markConversationRead,
} from '@/hooks/useConversations';
import { conversationDisplay } from '@/lib/conversation-display';
import { formatLastSeen } from '@/lib/time';
import { useChatStore } from '@/stores/chat';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConversationWithDetails } from '@/types';

export default function ChatScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  // Read the conversation from the list cache for header details.
  const conversation = queryClient
    .getQueryData<ConversationWithDetails[]>(CONVERSATIONS_KEY)
    ?.find((c) => c.id === id);
  const display = conversation
    ? conversationDisplay(conversation, myId)
    : null;

  // Mark active (so the list won't bump unread) + mark read on open.
  useEffect(() => {
    if (!id) return;
    setActiveConversation(id);
    if (myId) markConversationRead(id, myId, queryClient);
    return () => setActiveConversation(null);
  }, [id, myId, queryClient, setActiveConversation]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <Avatar
          uri={display?.avatarUri}
          name={display?.title}
          size={40}
          online={display?.online}
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {display?.title ?? 'Chat'}
          </Text>
          {display && !display.isGroup && !display.isSelf && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {display.online
                ? 'online'
                : formatLastSeen(
                    conversation?.members?.find((m) => m.user_id !== myId)?.profile
                      ?.last_seen
                  )}
            </Text>
          )}
        </View>
      </View>

      <ComingSoon
        icon="chatbox-ellipses-outline"
        title="Messages arrive next"
        subtitle="The full chat thread — sending, replies, reactions, media and read receipts — is the next phase."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { paddingHorizontal: 8, height: '100%', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 13 },
});
