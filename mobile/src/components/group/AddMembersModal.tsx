import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserRow } from '@/components/contacts/UserRow';
import { Button } from '@/components/ui/Button';
import { useUserSearch } from '@/hooks/useUsers';
import { useTheme } from '@/theme/ThemeProvider';
import type { SearchResult } from '@/types';

interface AddMembersModalProps {
  visible: boolean;
  /** Existing member ids to exclude from results. */
  existingIds: Set<string>;
  onClose: () => void;
  onAdd: (userIds: string[]) => Promise<void> | void;
}

export function AddMembersModal({
  visible,
  existingIds,
  onClose,
  onAdd,
}: AddMembersModalProps) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SearchResult[]>([]);
  const [saving, setSaving] = useState(false);

  const search = useUserSearch(query);
  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);

  const results = useMemo(
    () => search.results.filter((u) => !existingIds.has(u.id)),
    [search.results, existingIds]
  );

  const reset = useCallback(() => {
    setQuery('');
    setSelected([]);
    setSaving(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const toggle = useCallback((user: SearchResult) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }, []);

  const confirm = useCallback(async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      await onAdd(selected.map((u) => u.id));
      close();
    } catch {
      setSaving(false);
    }
  }, [selected, onAdd, close]);

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
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={close} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Add Members
          </Text>
          <View style={{ width: 32 }} />
        </View>

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
            autoFocus
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            search.loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                {search.active ? 'No users found' : 'Search for people to add.'}
              </Text>
            )
          }
        />

        <View style={{ padding: 16, paddingBottom: insets.bottom + 12 }}>
          <Button
            label={selected.length > 0 ? `Add (${selected.length})` : 'Add'}
            onPress={confirm}
            disabled={selected.length === 0 || saving}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    margin: 16,
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
