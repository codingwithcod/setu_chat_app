import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Aurora } from '@/components/ui/Aurora';
import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: ReactNode;
  /** Add default horizontal padding. */
  padded?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
  /**
   * Render the ambient aurora glow behind the ENTIRE screen, including the
   * status-bar area — so the status bar and header read as one seamless
   * surface. Defaults to true.
   */
  aurora?: boolean;
}

/** Themed screen container: safe-area aware, themed background + status bar. */
export function Screen({ children, padded = false, style, edges, aurora = true }: ScreenProps) {
  const { colors, scheme } = useTheme();
  return (
    // The root fills edge-to-edge (under the translucent status bar). The Aurora
    // lives here, BEHIND the safe-area padding, so its glow extends up through
    // the status bar. The SafeAreaView on top stays transparent so it shows
    // through.
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {aurora && <Aurora />}
      <SafeAreaView edges={edges ?? ['top', 'bottom', 'left', 'right']} style={styles.flex}>
        <View style={[styles.flex, padded && styles.padded, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 20 },
});
