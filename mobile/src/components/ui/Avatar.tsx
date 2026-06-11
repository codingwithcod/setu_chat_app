import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

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

/** Stable hue (0–359) derived from a string, so each person keeps one color. */
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/** A vivid two-stop gradient, deterministic per name — premium initial fallback. */
function gradientFor(name?: string): [string, string] {
  const hue = hueFromString(name || '?');
  const hue2 = (hue + 38) % 360;
  return [`hsl(${hue}, 62%, 52%)`, `hsl(${hue2}, 68%, 42%)`];
}

/** Soft pulsing halo behind the online dot. */
function OnlineDot({ size, ringColor }: { size: number; ringColor: string }) {
  const { colors } = useTheme();
  const dot = Math.max(10, size * 0.28);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
  }, [pulse]);

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 1.1 }],
    opacity: 0.45 * (1 - pulse.value),
  }));

  return (
    <View style={[styles.dotWrap, { width: dot, height: dot }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.halo,
          { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.success },
          halo,
        ]}
      />
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: colors.success,
          borderWidth: 2,
          borderColor: ringColor,
        }}
      />
    </View>
  );
}

export function Avatar({ uri, name, size = 48, online }: AvatarProps) {
  const { colors } = useTheme();

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
        <LinearGradient
          colors={gradientFor(name)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Text
            style={{
              color: '#fff',
              fontWeight: '700',
              fontSize: size * 0.4,
              textShadowColor: 'rgba(0,0,0,0.25)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {initials(name)}
          </Text>
        </LinearGradient>
      )}
      {online && <OnlineDot size={size} ringColor={colors.background} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  dotWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute' },
});
