import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MessageFile } from '@/types';
import { ImageViewer } from './ImageViewer';

const W = 244;
const GAP = 3;

export function ImageGrid({ files }: { files: MessageFile[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const urls = files.map((f) => f.file_url);

  const Img = ({
    index,
    w,
    h,
    overlay,
  }: {
    index: number;
    w: number;
    h: number;
    overlay?: number;
  }) => (
    <Pressable onPress={() => setViewerIndex(index)}>
      <Image source={{ uri: urls[index] }} style={{ width: w, height: h }} contentFit="cover" alt="image" transition={150} />
      {!!overlay && (
        <View style={[styles.overlay, { width: w, height: h }]}>
          <Text style={styles.overlayText}>+{overlay}</Text>
        </View>
      )}
    </Pressable>
  );

  const n = files.length;
  let grid: React.ReactNode;

  if (n === 1) {
    grid = <Img index={0} w={W} h={260} />;
  } else if (n === 2) {
    const w = (W - GAP) / 2;
    grid = (
      <View style={styles.row}>
        <Img index={0} w={w} h={160} />
        <Img index={1} w={w} h={160} />
      </View>
    );
  } else if (n === 3) {
    const half = (W - GAP) / 2;
    grid = (
      <View style={{ gap: GAP }}>
        <Img index={0} w={W} h={130} />
        <View style={styles.row}>
          <Img index={1} w={half} h={110} />
          <Img index={2} w={half} h={110} />
        </View>
      </View>
    );
  } else {
    const half = (W - GAP) / 2;
    const extra = n - 4;
    grid = (
      <View style={{ gap: GAP }}>
        <View style={styles.row}>
          <Img index={0} w={half} h={110} />
          <Img index={1} w={half} h={110} />
        </View>
        <View style={styles.row}>
          <Img index={2} w={half} h={110} />
          <Img index={3} w={half} h={110} overlay={extra > 0 ? extra : undefined} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {grid}
      <ImageViewer
        files={files}
        initialIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: GAP },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { color: '#fff', fontSize: 24, fontWeight: '800' },
});
