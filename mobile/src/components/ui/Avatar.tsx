import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  /** Show an online dot in the corner. */
  online?: boolean;
}

function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Avatar({ uri, name, size = 48, online }: AvatarProps) {
  const { colors } = useTheme();
  const dot = Math.max(10, size * 0.28);

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          alt={name ?? 'avatar'}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary },
          ]}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: size * 0.4 }}>
            {initials(name)}
          </Text>
        </View>
      )}
      {online && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: colors.success,
            borderWidth: 2,
            borderColor: colors.background,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
