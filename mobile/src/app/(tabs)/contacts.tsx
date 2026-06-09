import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { UserRow } from '@/components/contacts/UserRow';
import { Screen } from '@/components/ui/Screen';
import { useSuggestedUsers, useUserSearch } from '@/hooks/useUsers';
import { startPrivateChat } from '@/lib/conversation-actions';
import { useTheme } from '@/theme/ThemeProvider';
import type { SearchResult } from '@/types';

export default function ContactsScreen() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const search = useUserSearch(query);
  const { users: suggested, loading: loadingSuggested, reload } = useSuggestedUsers();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const openChat = useCallback(
    async (user: SearchResult) => {
      if (startingId) return;
      setStartingId(user.id);
      try {
        const id = await startPrivateChat(user.id, queryClient);
        setQuery('');
        router.push(`/chat/${id}`);
      } catch {
        // leave the user on the contacts screen; transient failure
      } finally {
        setStartingId(null);
      }
    },
    [startingId, queryClient, router]
  );

  const renderUser = useCallback(
    ({ item }: { item: SearchResult }) => (
      <UserRow
        user={item}
        onPress={() => openChat(item)}
        right={
          startingId === item.id ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="chatbubble-outline" size={20} color={colors.mutedForeground} />
          )
        }
      />
    ),
    [openChat, startingId, colors]
  );

  const showResults = search.active;
  const data = showResults ? search.results : suggested;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader title="Contacts" />

      {/* Search field */}
      <View style={styles.searchWrap}>
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
            placeholder="Search by name or @username"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* New group entry (hidden while searching) */}
      {!showResults && (
        <Pressable
          onPress={() => router.push('/new-group')}
          style={({ pressed }) => [
            styles.newGroup,
            { backgroundColor: pressed ? colors.secondary : 'transparent' },
          ]}
        >
          <View style={[styles.newGroupIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="people" size={22} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.newGroupLabel, { color: colors.foreground }]}>
            New Group
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
      )}

      {!showResults && (
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {loadingSuggested ? 'Loading suggestions…' : 'Suggested'}
        </Text>
      )}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          showResults ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          )
        }
        ListEmptyComponent={
          search.loading || loadingSuggested ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons
                name={showResults ? 'search-outline' : 'people-outline'}
                size={40}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {showResults
                  ? 'No users found'
                  : 'No suggestions right now.\nSearch to find people.'}
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15.5, height: '100%' },
  newGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  newGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
