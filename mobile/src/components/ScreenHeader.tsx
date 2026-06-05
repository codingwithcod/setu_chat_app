import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Logo } from './Logo';

interface ScreenHeaderProps {
  title?: string;
  /** Show the brand lockup instead of a plain title. */
  brand?: boolean;
  right?: ReactNode;
}

export function ScreenHeader({ title, brand, right }: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      {brand ? (
        <Logo size="sm" />
      ) : (
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      )}
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 22, fontWeight: '800' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
