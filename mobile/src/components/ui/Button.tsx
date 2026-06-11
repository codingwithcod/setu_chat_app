import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Touchable } from '@/components/ui/Touchable';
import { glow } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading element (e.g. an icon). */
  left?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  left,
  style,
  fullWidth = true,
}: ButtonProps) {
  const { colors, radius } = useTheme();
  const isDisabled = disabled || loading;

  const bg = {
    primary: colors.primary,
    destructive: colors.destructive,
    outline: 'transparent',
    ghost: 'transparent',
  }[variant];

  const fg = {
    primary: colors.primaryForeground,
    destructive: colors.destructiveForeground,
    outline: colors.foreground,
    ghost: colors.primary,
  }[variant];

  // Branded lift on filled buttons (only when actionable).
  const lift =
    !isDisabled && variant === 'primary'
      ? glow(colors.primary, 'sm')
      : !isDisabled && variant === 'destructive'
        ? glow(colors.destructive, 'sm')
        : null;

  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.border,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        lift,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {left}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
