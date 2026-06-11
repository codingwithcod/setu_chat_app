import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
}

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/** A placeholder block with a sweeping light shimmer (premium loading feel). */
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  const { colors, scheme } = useTheme();
  const [w, setW] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [x]);

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * (w || 1) }],
  }));

  const highlight = scheme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)';

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.muted, overflow: 'hidden' },
        style,
      ]}
    >
      {w > 0 && (
        <AnimatedGradient
          colors={['transparent', highlight, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.sweep, { width: w }, sweep]}
        />
      )}
    </View>
  );
}

/** A conversation/contact-row shaped skeleton (avatar + two lines). */
export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={52} height={52} radius={26} />
      <View style={styles.lines}>
        <Skeleton width="55%" height={15} />
        <Skeleton width="80%" height={13} />
      </View>
    </View>
  );
}

/** A list of row skeletons. */
export function RowSkeletonList({ count = 8 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

// A natural-looking conversation rhythm: [own?, width, height].
const THREAD_PATTERN: [boolean, number, number][] = [
  [false, 150, 36],
  [false, 210, 58],
  [true, 130, 36],
  [true, 190, 58],
  [false, 170, 36],
  [true, 110, 36],
  [false, 230, 80],
  [true, 160, 58],
  [false, 140, 36],
];

/** Chat-thread skeleton: alternating incoming/outgoing bubbles. */
export function ThreadSkeleton() {
  return (
    <View style={styles.thread}>
      {THREAD_PATTERN.map(([own, w, h], i) => (
        <View key={i} style={[styles.bubbleRow, own ? styles.alignEnd : styles.alignStart]}>
          <Skeleton width={w} height={h} radius={18} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sweep: { position: 'absolute', top: 0, bottom: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lines: { flex: 1, gap: 8 },
  thread: { padding: 16, gap: 14 },
  bubbleRow: { width: '100%' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
});
