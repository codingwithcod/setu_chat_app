import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  /** Filled variant shown when focused (e.g. 'chatbubble-ellipses'). */
  activeName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  size?: number;
}

/**
 * Tab icon that crossfades from a muted outline glyph to a primary-tinted
 * filled glyph when focused — no scaling or movement, just a clean themed
 * swap (WhatsApp-style active state).
 */
export function TabBarIcon({ name, activeName, focused, size = 28 }: TabBarIconProps) {
  const { colors } = useTheme();
  const f = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    f.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, f]);

  const outlineStyle = useAnimatedStyle(() => ({ opacity: 1 - f.value }));
  const filledStyle = useAnimatedStyle(() => ({ opacity: f.value }));

  return (
    <View style={[styles.wrap, { width: size + 4, height: size + 4 }]}>
      <Animated.View style={[styles.center, outlineStyle]}>
        <Ionicons name={name} size={size} color={colors.mutedForeground} />
      </Animated.View>
      <Animated.View style={[styles.center, filledStyle]}>
        <Ionicons name={activeName} size={size} color={colors.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
