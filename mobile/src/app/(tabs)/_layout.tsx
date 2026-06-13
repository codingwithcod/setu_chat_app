import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import type { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import { View } from 'react-native';

import { SwipeTabBar } from '@/components/navigation/SwipeTabBar';
import { Aurora } from '@/components/ui/Aurora';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/theme/ThemeProvider';

const { Navigator } = createMaterialTopTabNavigator();

// Bridge the material-top-tabs navigator into Expo Router's file-based routing.
const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabsLayout() {
  const { colors } = useTheme();
  usePresenceHeartbeat();
  useActivityFeed();
  usePushNotifications();

  return (
    // The gradient background is painted ONCE here, behind the pager, so it
    // stays fixed while only the (transparent) tab scenes swipe over it.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Aurora />
      <MaterialTopTabs
        tabBarPosition="bottom"
        tabBar={(props) => <SwipeTabBar {...props} />}
        screenOptions={{
          swipeEnabled: true,
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        <MaterialTopTabs.Screen name="index" options={{ title: 'Chats' }} />
        <MaterialTopTabs.Screen name="contacts" options={{ title: 'Contacts' }} />
        <MaterialTopTabs.Screen name="activity" options={{ title: 'Activity' }} />
        <MaterialTopTabs.Screen name="profile" options={{ title: 'Profile' }} />
      </MaterialTopTabs>
    </View>
  );
}
