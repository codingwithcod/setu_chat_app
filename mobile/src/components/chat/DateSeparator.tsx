import { StyleSheet, Text, View } from 'react-native';

import { formatDayLabel } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';

export function DateSeparator({ iso }: { iso: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.text, { color: colors.mutedForeground }]}>
          {formatDayLabel(iso)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', marginVertical: 10 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  text: { fontSize: 12, fontWeight: '600' },
});
