import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AddMembersModal } from '@/components/group/AddMembersModal';
import { UserRow, fullName } from '@/components/contacts/UserRow';
import { Avatar } from '@/components/ui/Avatar';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { CONVERSATIONS_KEY } from '@/hooks/useConversations';
import {
  addGroupMembers,
  changeMemberRole,
  deleteGroup,
  fetchConversation,
  leaveGroup,
  removeGroupMember,
  updateGroup,
} from '@/lib/conversation-actions';
import { pickAvatar, uploadAvatar } from '@/lib/media';
import { useTheme } from '@/theme/ThemeProvider';
import type { ConversationMember, ConversationWithDetails, Profile } from '@/types';

type Member = ConversationMember & { profile: Profile };

export default function GroupInfoScreen() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id ?? '';
  const { session } = useAuth();
  const myId = session?.user.id ?? '';
  const queryClient = useQueryClient();

  const [conv, setConv] = useState<ConversationWithDetails | null>(
    () =>
      queryClient
        .getQueryData<ConversationWithDetails[]>(CONVERSATIONS_KEY)
        ?.find((c) => c.id === conversationId) ?? null
  );
  const [loading, setLoading] = useState(!conv);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [menuMember, setMenuMember] = useState<Member | null>(null);

  // Fresh fetch (members + roles may be stale in the list cache).
  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    fetchConversation(conversationId)
      .then((c) => active && setConv(c))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [conversationId]);

  const members = useMemo<Member[]>(() => conv?.members ?? [], [conv]);
  const myRole = members.find((m) => m.user_id === myId)?.role ?? null;
  const isOwner = myRole === 'owner';
  const isAdmin = isOwner || myRole === 'admin';

  const sortedMembers = useMemo(() => {
    const rank = { owner: 0, admin: 1, member: 2 } as const;
    return [...members].sort((a, b) => rank[a.role] - rank[b.role]);
  }, [members]);

  const apply = useCallback(
    async (fn: () => Promise<ConversationWithDetails>) => {
      setBusy(true);
      try {
        const updated = await fn();
        // PATCH name/desc returns a bare row (no members) — merge, keep members.
        setConv((prev) =>
          prev
            ? { ...prev, ...updated, members: updated.members ?? prev.members }
            : updated
        );
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const saveName = useCallback(() => {
    const name = draftName.trim();
    setEditingName(false);
    if (!name || name === conv?.name) return;
    apply(() => updateGroup(conversationId, { name }, queryClient));
  }, [draftName, conv?.name, apply, conversationId, queryClient]);

  const saveDesc = useCallback(() => {
    const description = draftDesc.trim();
    setEditingDesc(false);
    if (description === (conv?.description ?? '')) return;
    apply(() => updateGroup(conversationId, { description }, queryClient));
  }, [draftDesc, conv?.description, apply, conversationId, queryClient]);

  const changeAvatar = useCallback(async () => {
    const asset = await pickAvatar();
    if (!asset) return;
    setBusy(true);
    try {
      const url = await uploadAvatar(asset, 'group-avatars', conversationId);
      await apply(() =>
        updateGroup(conversationId, { avatar_url: url }, queryClient)
      );
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [conversationId, apply, queryClient]);

  const onAddMembers = useCallback(
    (userIds: string[]) =>
      apply(() => addGroupMembers(conversationId, userIds, queryClient)),
    [apply, conversationId, queryClient]
  );

  const confirmRemove = useCallback(
    (m: Member) => {
      setMenuMember(null);
      Alert.alert(
        'Remove member',
        `Remove ${fullName(m.profile)} from the group?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () =>
              apply(() => removeGroupMember(conversationId, m.user_id, queryClient)),
          },
        ]
      );
    },
    [apply, conversationId, queryClient]
  );

  const toggleAdmin = useCallback(
    (m: Member) => {
      setMenuMember(null);
      const newRole = m.role === 'admin' ? 'member' : 'admin';
      apply(() => changeMemberRole(conversationId, m.user_id, newRole, queryClient));
    },
    [apply, conversationId, queryClient]
  );

  const confirmLeave = useCallback(() => {
    Alert.alert('Leave group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(conversationId, myId, queryClient);
            if (router.dismissAll) router.dismissAll();
            else router.replace('/(tabs)');
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  }, [conversationId, myId, queryClient, router]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete group',
      'This deletes the group for everyone. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(conversationId, queryClient);
              router.dismissAll?.();
              router.replace('/(tabs)');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Please try again.');
            }
          },
        },
      ]
    );
  }, [conversationId, queryClient, router]);

  const roleLabel = (role: Member['role']) =>
    role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : null;

  // Whether I can open the action menu for a given member.
  const canManage = (m: Member) => {
    if (m.user_id === myId) return false;
    if (isOwner) return true;
    if (isAdmin && m.role === 'member') return true;
    return false;
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Group Info
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {loading && !conv ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !conv ? (
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>Conversation not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Avatar + name */}
          <View style={styles.hero}>
            <Pressable onPress={isAdmin ? changeAvatar : undefined}>
              {conv.avatar_url ? (
                <Avatar uri={conv.avatar_url} name={conv.name ?? 'Group'} size={96} />
              ) : (
                <View style={[styles.heroAvatar, { backgroundColor: colors.accent }]}>
                  <Ionicons name="people" size={44} color={colors.primary} />
                </View>
              )}
              {isAdmin && (
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                  <Ionicons name="camera" size={16} color={colors.primaryForeground} />
                </View>
              )}
            </Pressable>

            {editingName ? (
              <View style={styles.editRow}>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  autoFocus
                  onSubmitEditing={saveName}
                  style={[
                    styles.nameEdit,
                    { color: colors.foreground, borderBottomColor: colors.primary },
                  ]}
                />
                <Pressable onPress={saveName} hitSlop={8}>
                  <Ionicons name="checkmark" size={24} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.nameRow}
                disabled={!isAdmin}
                onPress={() => {
                  setDraftName(conv.name ?? '');
                  setEditingName(true);
                }}
              >
                <Text style={[styles.groupName, { color: colors.foreground }]}>
                  {conv.name || 'Group'}
                </Text>
                {isAdmin && (
                  <Ionicons name="pencil" size={16} color={colors.mutedForeground} />
                )}
              </Pressable>
            )}
            <Text style={[styles.memberCount, { color: colors.mutedForeground }]}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Text>
          </View>

          {/* Description */}
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Description
            </Text>
            {editingDesc ? (
              <View>
                <TextInput
                  value={draftDesc}
                  onChangeText={setDraftDesc}
                  autoFocus
                  multiline
                  placeholder="Add a group description"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.descEdit, { color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                />
                <View style={styles.descActions}>
                  <Pressable onPress={() => setEditingDesc(false)} hitSlop={8}>
                    <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={saveDesc} hitSlop={8}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                disabled={!isAdmin}
                onPress={() => {
                  setDraftDesc(conv.description ?? '');
                  setEditingDesc(true);
                }}
              >
                <Text
                  style={{
                    color: conv.description ? colors.foreground : colors.mutedForeground,
                    fontSize: 15,
                    lineHeight: 21,
                  }}
                >
                  {conv.description ||
                    (isAdmin ? 'Tap to add a description' : 'No description')}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Members */}
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <View style={styles.membersHeader}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, paddingBottom: 0 }]}>
                {members.length} {members.length === 1 ? 'Member' : 'Members'}
              </Text>
              {isAdmin && (
                <Pressable onPress={() => setAddOpen(true)} style={styles.addBtn} hitSlop={8}>
                  <Ionicons name="person-add" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Add</Text>
                </Pressable>
              )}
            </View>

            {sortedMembers.map((m) => {
              const label = roleLabel(m.role);
              return (
                <UserRow
                  key={m.id}
                  user={{ ...m.profile, username: m.profile.username ?? '' }}
                  subtitle={
                    m.user_id === myId
                      ? 'You'
                      : m.profile.username
                        ? `@${m.profile.username}`
                        : undefined
                  }
                  onPress={canManage(m) ? () => setMenuMember(m) : undefined}
                  right={
                    <View style={styles.memberRight}>
                      {label && (
                        <View style={[styles.roleBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.roleText, { color: colors.primary }]}>
                            {label}
                          </Text>
                        </View>
                      )}
                      {canManage(m) && (
                        <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
                      )}
                    </View>
                  }
                />
              );
            })}
          </View>

          {/* Danger zone */}
          <View style={[styles.section, { borderTopColor: colors.border, gap: 4 }]}>
            {!isOwner && (
              <Pressable onPress={confirmLeave} style={styles.dangerRow}>
                <Ionicons name="exit-outline" size={22} color={colors.destructive} />
                <Text style={[styles.dangerText, { color: colors.destructive }]}>
                  Leave Group
                </Text>
              </Pressable>
            )}
            {isOwner && (
              <Pressable onPress={confirmDelete} style={styles.dangerRow}>
                <Ionicons name="trash-outline" size={22} color={colors.destructive} />
                <Text style={[styles.dangerText, { color: colors.destructive }]}>
                  Delete Group
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}

      {busy && (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      <AddMembersModal
        visible={addOpen}
        existingIds={new Set(members.map((m) => m.user_id))}
        onClose={() => setAddOpen(false)}
        onAdd={onAddMembers}
      />

      {/* Per-member action sheet */}
      <Modal
        visible={!!menuMember}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuMember(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuMember(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            {menuMember && (
              <>
                <Text style={[styles.sheetTitle, { color: colors.mutedForeground }]}>
                  {fullName(menuMember.profile)}
                </Text>
                {isOwner && menuMember.role !== 'owner' && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetAction,
                      { backgroundColor: pressed ? colors.secondary : 'transparent' },
                    ]}
                    onPress={() => toggleAdmin(menuMember)}
                  >
                    <Ionicons name="shield-outline" size={22} color={colors.foreground} />
                    <Text style={[styles.sheetActionText, { color: colors.foreground }]}>
                      {menuMember.role === 'admin' ? 'Remove as admin' : 'Make admin'}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetAction,
                    { backgroundColor: pressed ? colors.secondary : 'transparent' },
                  ]}
                  onPress={() => confirmRemove(menuMember)}
                >
                  <Ionicons name="person-remove-outline" size={22} color={colors.destructive} />
                  <Text style={[styles.sheetActionText, { color: colors.destructive }]}>
                    Remove from group
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupName: { fontSize: 22, fontWeight: '800' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  nameEdit: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 4,
    textAlign: 'center',
  },
  memberCount: { fontSize: 14 },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 8,
  },
  descEdit: {
    minHeight: 70,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  descActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, paddingTop: 10 },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: '700' },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  dangerText: { fontSize: 16, fontWeight: '600' },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 12 },
  sheet: { overflow: 'hidden', paddingVertical: 8, marginBottom: 8 },
  sheetTitle: { fontSize: 13, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 8 },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sheetActionText: { fontSize: 16, fontWeight: '500' },
});
