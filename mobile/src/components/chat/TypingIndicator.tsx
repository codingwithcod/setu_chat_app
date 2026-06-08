import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { TypingUser } from '@/types';

function Dot({ delay, color }: { delay: number; color: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);
  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />;
}

export function TypingIndicator({ users }: { users: TypingUser[] }) {
  const { colors } = useTheme();
  if (users.length === 0) return null;

  const label =
    users.length === 1
      ? `${users[0].username} is typing`
      : `${users.length} people are typing`;

  return (
    <View style={styles.row}>
      <View style={[styles.bubble, { backgroundColor: colors.card }]}>
        <Dot delay={0} color={colors.mutedForeground} />
        <Dot delay={150} color={colors.mutedForeground} />
        <Dot delay={300} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  bubble: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontStyle: 'italic' },
});
