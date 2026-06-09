import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/theme/ThemeProvider';
import type { SearchResult } from '@/types';

interface UserRowProps {
  user: Pick<
    SearchResult,
    'first_name' | 'last_name' | 'username' | 'avatar_url' | 'is_online'
  >;
  onPress?: () => void;
  /** Right-hand accessory (checkbox, role badge, menu button…). */
  right?: ReactNode;
  /** Override the secondary line (defaults to @username). */
  subtitle?: string;
  disabled?: boolean;
}

export function fullName(u: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
}

/** A single user line: avatar + name + @username, with an optional accessory. */
export function UserRow({ user, onPress, right, subtitle, disabled }: UserRowProps) {
  const { colors } = useTheme();
  const name = fullName(user);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed && onPress ? colors.secondary : 'transparent' },
      ]}
    >
      <Avatar
        uri={user.avatar_url}
        name={name}
        size={48}
        online={user.is_online}
      />
      <View style={styles.middle}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {subtitle ?? (user.username ? `@${user.username}` : '')}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13.5 },
});
