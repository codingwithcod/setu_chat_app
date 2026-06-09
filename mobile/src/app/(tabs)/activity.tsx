import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComingSoon } from '@/components/ComingSoon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { formatListTime } from '@/lib/time';
import { useNotificationStore, type AppNotification } from '@/stores/notifications';
import { useTheme } from '@/theme/ThemeProvider';

export default function ActivityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const onPress = useCallback(
    (n: AppNotification) => {
      markAsRead(n.id);
      if (n.conversationId) router.push(`/chat/${n.conversationId}`);
    },
    [markAsRead, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const icon =
        item.type === 'message'
          ? 'chatbubble'
          : item.type === 'group'
            ? 'people'
            : 'notifications';
      return (
        <Pressable
          onPress={() => onPress(item)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: pressed
                ? colors.secondary
                : item.read
                  ? 'transparent'
                  : colors.withAlpha('primary', 0.06),
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: colors.muted }]}>
            <Ionicons
              name={icon}
              size={18}
              color={item.type === 'system' ? colors.mutedForeground : colors.primary}
            />
          </View>
          <View style={styles.middle}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.body}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatListTime(item.createdAt)}
            </Text>
          </View>
          {!item.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
        </Pressable>
      );
    },
    [onPress, colors]
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Activity"
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllAsRead} hitSlop={8} style={styles.readAll}>
              <Ionicons name="checkmark-done" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Read all</Text>
            </Pressable>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <ComingSoon
          icon="notifications-outline"
          title="No activity yet"
          subtitle="Mentions, new messages and group updates will show up here."
        />
      ) : (
        <FlashList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  readAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
  title: { fontSize: 15.5, fontWeight: '700' },
  body: { fontSize: 14 },
  time: { fontSize: 11, marginTop: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
});
