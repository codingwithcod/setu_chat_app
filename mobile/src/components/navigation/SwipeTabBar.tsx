import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { TAB_BAR_HEIGHT } from '@/components/navigation/useTabBarHeight';
import { haptics } from '@/lib/haptics';
import { useNotificationStore } from '@/stores/notifications';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { name: IconName; active: IconName }> = {
  index: { name: 'chatbubbles-outline', active: 'chatbubbles' },
  contacts: { name: 'people-outline', active: 'people' },
  activity: { name: 'notifications-outline', active: 'notifications' },
  profile: { name: 'person-outline', active: 'person' },
};

/**
 * Floating glass tab bar for the swipeable (material-top-tabs) tab navigator.
 * Pinned to the bottom and absolutely positioned so screen content scrolls
 * beneath the frosted blur, matching the previous bottom-tabs look.
 */
export function SwipeTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const unread = useNotificationStore((s) => s.unreadCount);

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopColor: colors.border,
        },
      ]}
    >
      <BlurView
        intensity={50}
        tint={scheme === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.withAlpha('card', scheme === 'dark' ? 0.55 : 0.6) },
        ]}
      />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icon = ICONS[route.name];
          const color = focused ? colors.primary : colors.mutedForeground;

          const onPress = () => {
            haptics.selection();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab} hitSlop={6}>
              <View>
                {icon && (
                  <TabBarIcon name={icon.name} activeName={icon.active} color={color} focused={focused} />
                )}
                {route.name === 'activity' && unread > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                      {unread > 99 ? '99+' : unread}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
