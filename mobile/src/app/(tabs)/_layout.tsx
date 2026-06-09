import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useActivityFeed } from '@/hooks/useActivityFeed';
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationStore } from '@/stores/notifications';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();
  usePresenceHeartbeat();
  useActivityFeed();
  usePushNotifications();
  const unread = useNotificationStore((s) => s.unreadCount);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.primaryForeground },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
