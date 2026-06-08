import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MessageFile } from '@/types';
import { ImageViewer } from './ImageViewer';

const W = 244;
const GAP = 3;

export function ImageGrid({ files }: { files: MessageFile[] }) {
  const [viewer, setViewer] = useState<string | null>(null);
  const urls = files.map((f) => f.file_url);

  const Img = ({
    uri,
    w,
    h,
    overlay,
  }: {
    uri: string;
    w: number;
    h: number;
    overlay?: number;
  }) => (
    <Pressable onPress={() => setViewer(uri)}>
      <Image source={{ uri }} style={{ width: w, height: h }} contentFit="cover" alt="image" transition={150} />
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
    grid = <Img uri={urls[0]} w={W} h={260} />;
  } else if (n === 2) {
    const w = (W - GAP) / 2;
    grid = (
      <View style={styles.row}>
        <Img uri={urls[0]} w={w} h={160} />
        <Img uri={urls[1]} w={w} h={160} />
      </View>
    );
  } else if (n === 3) {
    const half = (W - GAP) / 2;
    grid = (
      <View style={{ gap: GAP }}>
        <Img uri={urls[0]} w={W} h={130} />
        <View style={styles.row}>
          <Img uri={urls[1]} w={half} h={110} />
          <Img uri={urls[2]} w={half} h={110} />
        </View>
      </View>
    );
  } else {
    const half = (W - GAP) / 2;
    const extra = n - 4;
    grid = (
      <View style={{ gap: GAP }}>
        <View style={styles.row}>
          <Img uri={urls[0]} w={half} h={110} />
          <Img uri={urls[1]} w={half} h={110} />
        </View>
        <View style={styles.row}>
          <Img uri={urls[2]} w={half} h={110} />
          <Img uri={urls[3]} w={half} h={110} overlay={extra > 0 ? extra : undefined} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {grid}
      <ImageViewer uri={viewer} visible={!!viewer} onClose={() => setViewer(null)} />
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
