import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { api } from '@/lib/api';
import { formatLastSeen } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import type { UserSession } from '@/types';

function deviceIcon(type: UserSession['device_type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'mobile_app':
    case 'mobile_browser':
      return 'phone-portrait-outline';
    case 'tablet_browser':
      return 'tablet-portrait-outline';
    default:
      return 'desktop-outline';
  }
}

function deviceLabel(s: UserSession): string {
  const parts = [s.browser_name, s.os_name].filter(Boolean);
  return parts.join(' · ') || s.device_type.replace(/_/g, ' ');
}

export default function SessionsScreen() {
  const { colors, radius } = useTheme();
  const router = useRouter();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<UserSession[]>('/api/sessions');
      setSessions(data ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = useCallback(
    (s: UserSession) => {
      Alert.alert(
        'Revoke session',
        `Sign out ${s.device_name || 'this device'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              setRevoking(s.id);
              try {
                await api.del(`/api/sessions/${s.id}`);
                setSessions((prev) => prev.filter((x) => x.id !== s.id));
              } catch (err) {
                Alert.alert('Error', err instanceof Error ? err.message : 'Please try again.');
              } finally {
                setRevoking(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: UserSession }) => (
      <View style={[styles.row, { borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card }]}>
        <View style={[styles.icon, { backgroundColor: colors.accent }]}>
          <Ionicons name={deviceIcon(item.device_type)} size={22} color={colors.primary} />
        </View>
        <View style={styles.middle}>
          <Text style={[styles.device, { color: colors.foreground }]} numberOfLines={1}>
            {item.device_name || 'Unknown device'}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {deviceLabel(item)}
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.location ? `${item.location} · ` : ''}
            {formatLastSeen(item.last_active_at)}
          </Text>
        </View>
        {item.is_current ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>This device</Text>
          </View>
        ) : revoking === item.id ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Pressable onPress={() => revoke(item)} hitSlop={8} style={styles.revokeBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
          </Pressable>
        )}
      </View>
    ),
    [colors, radius, revoking, revoke]
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Active Sessions</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>
              Devices currently signed in to your account. Revoke any you don&apos;t recognise.
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="shield-checkmark-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No other active sessions.
              </Text>
            </View>
          }
        />
      )}
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
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  intro: { fontSize: 13.5, lineHeight: 20, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
  device: { fontSize: 15.5, fontWeight: '700' },
  meta: { fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  revokeBtn: { padding: 4 },
});
