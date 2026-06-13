import { Feather, Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { downloadFile } from '@/lib/download';
import { haptics } from '@/lib/haptics';
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

// Code / plain-text extensions get a code icon (their MIME is unreliable).
const CODE_EXTENSIONS = new Set([
  'md', 'markdown', 'txt', 'rtf', 'csv', 'tsv', 'log',
  'json', 'yaml', 'yml', 'toml', 'xml', 'ini',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'py', 'pyi',
  'css', 'scss', 'less',
  'java', 'kt', 'go', 'rs', 'c', 'cpp', 'h', 'cs', 'rb', 'php', 'swift', 'dart', 'sql', 'html', 'svg',
]);

export function iconFor(
  mime?: string | null,
  name?: string | null,
  fileType?: string | null
): { name: keyof typeof Ionicons.glyphMap; color: string } {
  if (fileType === 'video') return { name: 'videocam', color: '#8b5cf6' };
  if (fileType === 'audio') return { name: 'musical-notes', color: '#ec4899' };
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
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (CODE_EXTENSIONS.has(ext)) return { name: 'code-slash', color: '#06b6d4' };
  return { name: 'document', color: '#64748b' };
}

export function FileCard({ file, onOwn }: { file: MessageFile; onOwn: boolean }) {
  const { colors, radius } = useTheme();
  const icon = iconFor(file.mime_type, file.file_name);
  const [busy, setBusy] = useState(false);

  const onDownload = async () => {
    if (busy) return;
    haptics.selection();
    setBusy(true);
    const res = await downloadFile(file.file_url, file.file_name, file.mime_type);
    setBusy(false);
    if (res.ok) {
      haptics.success();
      Alert.alert('Downloaded', `"${file.file_name}" was saved to your device.`);
    } else if (res.reason === 'permission') {
      haptics.error();
      Alert.alert('Permission needed', 'Choose a folder to save your downloads.');
    } else {
      haptics.error();
      Alert.alert('Download failed', 'Could not download the file. Please try again.');
    }
  };

  return (
    <Pressable
      onPress={onDownload}
      disabled={busy}
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
      {busy ? (
        <ActivityIndicator size="small" color={onOwn ? 'rgba(255,255,255,0.85)' : colors.mutedForeground} />
      ) : (
        <Feather
          name="download"
          size={19}
          color={onOwn ? 'rgba(255,255,255,0.85)' : colors.mutedForeground}
        />
      )}
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
