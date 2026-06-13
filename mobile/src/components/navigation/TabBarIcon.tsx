import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

export type IconFamily = 'ionicons' | 'mci';

interface TabBarIconProps {
  /** Which icon set the glyph names belong to (default Ionicons). */
  family?: IconFamily;
  name: string;
  /** Filled variant shown when focused (e.g. 'message'). */
  activeName: string;
  focused: boolean;
  size?: number;
}

/**
 * Tab icon that crossfades from a muted outline glyph to a primary-tinted
 * filled glyph when focused — no scaling or movement, just a clean themed
 * swap. Supports Ionicons or MaterialCommunityIcons per tab.
 */
export function TabBarIcon({
  family = 'ionicons',
  name,
  activeName,
  focused,
  size = 28,
}: TabBarIconProps) {
  const { colors } = useTheme();
  const f = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    f.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, f]);

  const outlineStyle = useAnimatedStyle(() => ({ opacity: 1 - f.value }));
  const filledStyle = useAnimatedStyle(() => ({ opacity: f.value }));

  const render = (glyph: string, color: string) =>
    family === 'mci' ? (
      <MaterialCommunityIcons
        name={glyph as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={color}
      />
    ) : (
      <Ionicons name={glyph as keyof typeof Ionicons.glyphMap} size={size} color={color} />
    );

  return (
    <View style={[styles.wrap, { width: size + 4, height: size + 4 }]}>
      <Animated.View style={[styles.center, outlineStyle]}>
        {render(name, colors.mutedForeground)}
      </Animated.View>
      <Animated.View style={[styles.center, filledStyle]}>
        {render(activeName, colors.primary)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
