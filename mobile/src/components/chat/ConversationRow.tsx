import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Touchable } from '@/components/ui/Touchable';
import {
  conversationDisplay,
  lastMessagePreview,
} from '@/lib/conversation-display';
import { formatListTime } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConversationWithDetails } from '@/types';

interface ConversationRowProps {
  conversation: ConversationWithDetails;
  myId: string;
  onPress: (id: string) => void;
}

function ConversationRowBase({ conversation, myId, onPress }: ConversationRowProps) {
  const { colors } = useTheme();
  const d = conversationDisplay(conversation, myId);
  const preview = lastMessagePreview(conversation, myId);
  const time = formatListTime(conversation.last_message_at);
  const unread = conversation.unread_count ?? 0;
  const hasUnread = unread > 0;

  return (
    <Touchable
      onPress={() => onPress(conversation.id)}
      style={[styles.row, { backgroundColor: colors.background }]}
    >
      {d.isSelf ? (
        <View style={[styles.selfAvatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="bookmark" size={24} color={colors.primaryForeground} />
        </View>
      ) : d.isGroup ? (
        <View style={[styles.selfAvatar, { backgroundColor: colors.accent }]}>
          {d.avatarUri ? (
            <Avatar uri={d.avatarUri} name={d.title} size={52} />
          ) : (
            <Ionicons name="people" size={26} color={colors.primary} />
          )}
        </View>
      ) : (
        <Avatar uri={d.avatarUri} name={d.title} size={52} online={d.online} />
      )}

      <View style={styles.middle}>
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {d.title}
        </Text>
        <Text
          style={[
            styles.preview,
            { color: hasUnread ? colors.foreground : colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.time,
            { color: hasUnread ? colors.primary : colors.mutedForeground },
          ]}
        >
          {time}
        </Text>
        {hasUnread && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
              {unread > 99 ? '99+' : unread}
            </Text>
          </View>
        )}
      </View>
    </Touchable>
  );
}

export const ConversationRow = memo(ConversationRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  selfAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  middle: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '700' },
  preview: { fontSize: 14 },
  right: { alignItems: 'flex-end', gap: 6, minWidth: 44 },
  time: { fontSize: 12, fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
