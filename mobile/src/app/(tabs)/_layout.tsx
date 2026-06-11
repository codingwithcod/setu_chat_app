import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { haptics } from '@/lib/haptics';
import { useNotificationStore } from '@/stores/notifications';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
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
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: colors.background },
        // Frosted-glass bar that content scrolls beneath. Screens add bottom
        // inset via useBottomTabBarHeight so nothing hides under it.
        tabBarStyle: {
          position: 'absolute',
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          backgroundColor: 'transparent',
          elevation: 0,
          height: 60 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={50}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              // Android only renders a real blur with this method; without it
              // expo-blur falls back to a flat tint. The overlay below keeps
              // contrast solid either way.
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            {/* Tint overlay keeps contrast solid over busy content. */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.withAlpha('card', scheme === 'dark' ? 0.55 : 0.6) },
              ]}
            />
          </View>
        ),
      }}
      screenListeners={{ tabPress: () => haptics.selection() }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="chatbubbles-outline" activeName="chatbubbles" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="people-outline" activeName="people" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.primaryForeground },
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="notifications-outline" activeName="notifications" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="person-outline" activeName="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
