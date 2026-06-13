import { useTabBarHeight } from '@/components/navigation/useTabBarHeight';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ComingSoon } from '@/components/ComingSoon';
import { ConversationRow } from '@/components/chat/ConversationRow';
import { SuggestedPeopleCard } from '@/components/chat/SuggestedPeopleCard';
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
  const tabBarHeight = useTabBarHeight();
  const myId = session?.user.id ?? '';
  const { data, isLoading, isError, refetch, isRefetching } = useConversations();

  const openConversation = useCallback(
    (id: string) => router.push(`/chat/${id}`),
    [router]
  );

  const goToContacts = useCallback(() => router.navigate('/contacts'), [router]);

  // Saved Messages (the self conversation) is ALWAYS pinned on top — exactly
  // like the web — so it's never hidden.
  const conversations = data ?? [];
  const self = conversations.find((c) => c.type === 'self') ?? null;
  const others = conversations.filter((c) => c.type !== 'self');
  const ordered = self ? [self, ...others] : others;

  // Few *real* (non-self) chats → surface the premium "find people" CTA below
  // the list (without hiding Saved Messages or anything else).
  const fewChats = others.length < 5;

  const renderItem = useCallback(
    ({ item }: { item: ConversationWithDetails }) => (
      <ConversationRow conversation={item} myId={myId} onPress={openConversation} />
    ),
    [myId, openConversation]
  );

  return (
    <Screen bare edges={['top', 'left', 'right']}>
      <ScreenHeader brand />
      {isLoading ? (
        <RowSkeletonList />
      ) : isError ? (
        <ComingSoon
          icon="cloud-offline-outline"
          title="Couldn't load chats"
          subtitle="Pull to refresh, and make sure you're connected."
        />
      ) : ordered.length === 0 ? (
        <View style={[styles.flex, styles.center]}>
          <SuggestedPeopleCard onPress={goToContacts} />
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(260)} style={styles.flex}>
          <FlashList
            data={ordered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 8 }}
            ItemSeparatorComponent={() => (
              <View style={[styles.sep, { backgroundColor: colors.border }]} />
            )}
            // Keep every chat (incl. Saved Messages) visible; just append the CTA
            // below the list while the user only has a few conversations.
            ListFooterComponent={
              fewChats ? (
                <View style={styles.ctaSpace}>
                  <SuggestedPeopleCard onPress={goToContacts} />
                </View>
              ) : null
            }
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
  center: { alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 80 },
  ctaSpace: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
});
