import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ComingSoon } from '@/components/ComingSoon';
import { ConversationRow } from '@/components/chat/ConversationRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Screen } from '@/components/ui/Screen';
import { RowSkeletonList } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConversationWithDetails } from '@/types';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const myId = session?.user.id ?? '';
  const { data, isLoading, isError, refetch, isRefetching } = useConversations();

  const openConversation = useCallback(
    (id: string) => router.push(`/chat/${id}`),
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationWithDetails }) => (
      <ConversationRow conversation={item} myId={myId} onPress={openConversation} />
    ),
    [myId, openConversation]
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader brand />
      {isLoading ? (
        <RowSkeletonList />
      ) : isError ? (
        <ComingSoon
          icon="cloud-offline-outline"
          title="Couldn't load chats"
          subtitle="Pull to refresh, and make sure you're connected."
        />
      ) : !data || data.length === 0 ? (
        <ComingSoon
          icon="chatbubbles-outline"
          title="No conversations yet"
          subtitle="Head to Contacts to find people and start chatting."
        />
      ) : (
        <Animated.View entering={FadeIn.duration(260)} style={styles.flex}>
          <FlashList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 8 }}
            ItemSeparatorComponent={() => (
              <View style={[styles.sep, { backgroundColor: colors.border }]} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        </Animated.View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 80 },
});
