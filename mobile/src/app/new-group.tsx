import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserRow, fullName } from '@/components/contacts/UserRow';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useUserSearch } from '@/hooks/useUsers';
import { createGroup } from '@/lib/conversation-actions';
import { useTheme } from '@/theme/ThemeProvider';
import type { SearchResult } from '@/types';

export default function NewGroupScreen() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [creating, setCreating] = useState(false);

  const search = useUserSearch(query);
  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);

  const toggle = useCallback((user: SearchResult) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }, []);

  const canCreate = name.trim().length > 0 && selected.length > 0 && !creating;

  const submit = useCallback(async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const id = await createGroup(
        { name: name.trim(), memberIds: selected.map((u) => u.id) },
        queryClient
      );
      router.replace(`/chat/${id}`);
    } catch (err) {
      setCreating(false);
      Alert.alert(
        'Could not create group',
        err instanceof Error ? err.message : 'Please try again.'
      );
    }
  }, [canCreate, name, selected, queryClient, router]);

  const renderUser = useCallback(
    ({ item }: { item: SearchResult }) => {
      const checked = selectedIds.has(item.id);
      return (
        <UserRow
          user={item}
          onPress={() => toggle(item)}
          right={
            <View
              style={[
                styles.check,
                {
                  borderColor: checked ? colors.primary : colors.border,
                  backgroundColor: checked ? colors.primary : 'transparent',
                },
              ]}
            >
              {checked && (
                <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
              )}
            </View>
          }
        />
      );
    },
    [selectedIds, toggle, colors]
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Group</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Group name */}
      <View style={styles.nameWrap}>
        <View style={[styles.groupIcon, { backgroundColor: colors.accent }]}>
          <Ionicons name="people" size={26} color={colors.primary} />
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.nameInput,
            { color: colors.foreground, borderBottomColor: colors.border },
          ]}
        />
      </View>

      {/* Selected chips */}
      {selected.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {selected.map((u) => (
            <Pressable key={u.id} onPress={() => toggle(u)} style={styles.chip}>
              <Avatar uri={u.avatar_url} name={fullName(u)} size={56} />
              <View style={[styles.chipRemove, { backgroundColor: colors.foreground }]}>
                <Ionicons name="close" size={12} color={colors.background} />
              </View>
              <Text
                style={[styles.chipName, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {u.first_name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Member search */}
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
          placeholder="Add members"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
      </View>

      <FlatList
        data={search.results}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          search.loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : search.active ? (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              No users found
            </Text>
          ) : (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Search for people to add to the group.
            </Text>
          )
        }
      />

      {/* Create */}
      <View style={{ padding: 16, paddingBottom: insets.bottom + 12 }}>
        <Button
          label={
            selected.length > 0 ? `Create Group (${selected.length})` : 'Create Group'
          }
          onPress={submit}
          disabled={!canCreate}
          loading={creating}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chips: { gap: 14, paddingHorizontal: 16, paddingBottom: 12 },
  chip: { width: 56, alignItems: 'center', gap: 4 },
  chipRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipName: { fontSize: 12, maxWidth: 56 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15.5, height: '100%' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', paddingTop: 40 },
  hint: { fontSize: 14, textAlign: 'center', paddingTop: 30, paddingHorizontal: 32, lineHeight: 21 },
});
