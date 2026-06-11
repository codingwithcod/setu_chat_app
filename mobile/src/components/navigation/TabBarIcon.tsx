import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  /** Filled variant shown when focused (e.g. 'chatbubbles'). */
  activeName: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}

/**
 * Animated tab icon: springs up + scales when focused, swaps to the filled
 * glyph, and reveals a small dot underneath. Gives the tab bar a lively,
 * deliberate feel instead of a static color swap.
 */
export function TabBarIcon({ name, activeName, color, focused }: TabBarIconProps) {
  const { colors } = useTheme();
  const f = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    f.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 220, mass: 0.6 });
  }, [focused, f]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + f.value * 0.12 }, { translateY: -f.value * 2 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 150 }),
    transform: [{ scale: f.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={iconStyle}>
        <Ionicons name={focused ? activeName : name} size={24} color={color} />
      </Animated.View>
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.primary }, dotStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', height: 30 },
  dot: { position: 'absolute', bottom: -7, width: 5, height: 5, borderRadius: 2.5 },
});
