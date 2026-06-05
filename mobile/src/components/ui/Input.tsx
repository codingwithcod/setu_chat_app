import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  /** Show a show/hide toggle for password fields. */
  password?: boolean;
}

export function Input({ label, error, password, ...props }: InputProps) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error
    ? colors.destructive
    : focused
      ? colors.ring
      : colors.input;

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderRadius: radius.md,
            backgroundColor: colors.card,
            borderWidth: focused ? 2 : 1,
            paddingHorizontal: focused ? 13 : 14,
          },
        ]}
      >
        <TextInput
          {...props}
          secureTextEntry={password ? hidden : props.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
        />
        {password && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  error: { fontSize: 13 },
});
