import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: ReactNode;
  /** Add default horizontal padding. */
  padded?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
}

/** Themed screen container: safe-area aware, themed background + status bar. */
export function Screen({ children, padded = false, style, edges }: ScreenProps) {
  const { colors, scheme } = useTheme();
  return (
    <SafeAreaView
      edges={edges ?? ['top', 'bottom', 'left', 'right']}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.flex, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 20 },
});
