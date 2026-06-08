import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { MessageFile } from '@/types';

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function iconFor(mime?: string | null): { name: keyof typeof Ionicons.glyphMap; color: string } {
  const m = mime ?? '';
  if (m.includes('pdf')) return { name: 'document-text', color: '#ef4444' };
  if (m.includes('word') || m.includes('msword') || m.includes('document'))
    return { name: 'document-text', color: '#3b82f6' };
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv'))
    return { name: 'grid', color: '#22c55e' };
  if (m.includes('presentation') || m.includes('powerpoint'))
    return { name: 'easel', color: '#f97316' };
  if (m.includes('zip') || m.includes('rar') || m.includes('compressed'))
    return { name: 'archive', color: '#eab308' };
  return { name: 'document', color: '#64748b' };
}

export function FileCard({ file, onOwn }: { file: MessageFile; onOwn: boolean }) {
  const { colors, radius } = useTheme();
  const icon = iconFor(file.mime_type);

  return (
    <Pressable
      onPress={() => Linking.openURL(file.file_url)}
      style={[
        styles.card,
        {
          backgroundColor: onOwn ? 'rgba(0,0,0,0.18)' : colors.secondary,
          borderRadius: radius.md,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.background }]}>
        <Ionicons name={icon.name} size={24} color={icon.color} />
      </View>
      <View style={styles.meta}>
        <Text
          style={[styles.name, { color: onOwn ? '#fff' : colors.foreground }]}
          numberOfLines={1}
        >
          {file.file_name}
        </Text>
        <Text
          style={{ color: onOwn ? 'rgba(255,255,255,0.7)' : colors.mutedForeground, fontSize: 12 }}
        >
          {formatBytes(file.file_size)}
        </Text>
      </View>
      <Ionicons
        name="download-outline"
        size={20}
        color={onOwn ? 'rgba(255,255,255,0.85)' : colors.mutedForeground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    width: 250,
    marginTop: 4,
  },
  icon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
});
