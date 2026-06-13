import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatBytes, iconFor } from '@/components/chat/FileCard';
import { ImageViewer } from '@/components/chat/ImageViewer';
import { downloadFile } from '@/lib/download';
import { haptics } from '@/lib/haptics';
import type { SharedAttachment } from '@/hooks/useConversationFiles';
import { useTheme } from '@/theme/ThemeProvider';

const COLS = 3;
const H_PAD = 16;
const GRID_GAP = 6;

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

function EmptyState({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <Centered>
      <Ionicons name={icon} size={48} color={colors.withAlpha('mutedForeground', 0.35)} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{text}</Text>
    </Centered>
  );
}

/** Photos tab — grid of every shared image; tap opens the fullscreen carousel. */
export function SharedPhotos({
  photos,
  loading,
}: {
  photos: SharedAttachment[];
  loading: boolean;
}) {
  const { colors } = useTheme();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }
  if (photos.length === 0) {
    return <EmptyState icon="image-outline" text="No photos shared yet" />;
  }

  const cell = (Dimensions.get('window').width - H_PAD * 2 - GRID_GAP * (COLS - 1)) / COLS;

  return (
    <View style={styles.flex}>
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={COLS}
        style={styles.flex}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={{ gap: GRID_GAP }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setViewerIndex(index)}>
            <Image
              source={{ uri: item.file_url }}
              style={[styles.cell, { width: cell, height: cell, backgroundColor: colors.muted }]}
              contentFit="cover"
              transition={150}
              alt={item.file_name}
            />
          </Pressable>
        )}
      />

      <ImageViewer
        files={photos}
        initialIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

/** Files tab — every non-image attachment; tap opens it externally. */
export function SharedFiles({
  files,
  loading,
}: {
  files: SharedAttachment[];
  loading: boolean;
}) {
  const { colors, radius } = useTheme();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const onDownload = async (item: SharedAttachment) => {
    if (downloadingId) return;
    haptics.selection();
    setDownloadingId(item.id);
    const res = await downloadFile(item.file_url, item.file_name, item.mime_type);
    setDownloadingId(null);
    if (res.ok) {
      haptics.success();
      Alert.alert('Downloaded', `"${item.file_name}" was saved to your device.`);
    } else if (res.reason === 'permission') {
      haptics.error();
      Alert.alert('Permission needed', 'Choose a folder to save your downloads.');
    } else {
      haptics.error();
      Alert.alert('Download failed', 'Could not download the file. Please try again.');
    }
  };

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }
  if (files.length === 0) {
    return <EmptyState icon="folder-open-outline" text="No files shared yet" />;
  }

  return (
    <FlatList
      data={files}
      keyExtractor={(f) => f.id}
      style={styles.flex}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const icon = iconFor(item.mime_type, item.file_name, item.file_type);
        const date = new Date(item.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const meta = [item.sender_name, date, item.file_size != null ? formatBytes(item.file_size) : null]
          .filter(Boolean)
          .join(' · ');
        const busy = downloadingId === item.id;
        return (
          <View style={[styles.row, { borderRadius: radius.lg }]}>
            <View style={[styles.fileIcon, { backgroundColor: colors.withAlpha('primary', 0.1) }]}>
              <Ionicons name={icon.name} size={22} color={icon.color} />
            </View>
            <View style={styles.fileMeta}>
              <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                {item.file_name}
              </Text>
              <Text style={[styles.fileSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {meta}
              </Text>
            </View>
            <Pressable
              onPress={() => onDownload(item)}
              disabled={!!downloadingId}
              hitSlop={8}
              style={[styles.downloadBtn, { backgroundColor: colors.withAlpha('primary', 0.1) }]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="download" size={19} color={colors.primary} />
              )}
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { fontSize: 14, fontWeight: '500' },

  gridContent: { paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 32, gap: GRID_GAP },
  cell: { borderRadius: 10 },

  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMeta: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 14.5, fontWeight: '600' },
  fileSub: { fontSize: 12.5, marginTop: 2 },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
