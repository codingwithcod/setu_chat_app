import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticKind = 'light' | 'medium' | 'selection' | 'none';

interface TouchableProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far to scale down on press-in. Default 0.97. */
  scaleTo?: number;
  /** Opacity to dip to on press-in. Default 1 (scale-only). */
  activeOpacity?: number;
  /** Haptic fired on press-in. Default 'light'. Use 'none' for high-frequency UI. */
  haptic?: HapticKind;
}

/**
 * The app's standard tappable surface: a spring-driven scale-down + light haptic
 * on press-in. Drop-in for Pressable/TouchableOpacity on rows, buttons, cards,
 * avatars — anything tappable. This press feedback is the single biggest
 * "premium feel" win, so prefer it over bare Pressable everywhere.
 */
export function Touchable({
  children,
  style,
  scaleTo = 0.97,
  activeOpacity = 1,
  haptic = 'light',
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: TouchableProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressed.value ? scaleTo : 1, {
          damping: 18,
          stiffness: 320,
          mass: 0.5,
        }),
      },
    ],
    opacity: withTiming(pressed.value ? activeOpacity : 1, { duration: 90 }),
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        if (!disabled) {
          pressed.value = 1;
          if (haptic !== 'none') haptics[haptic]();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = 0;
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
