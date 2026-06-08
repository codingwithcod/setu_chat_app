import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { MessageFile } from '@/types';

export function ChatVideo({ file }: { file: MessageFile }) {
  const { radius } = useTheme();
  const player = useVideoPlayer(file.file_url, (p) => {
    p.loop = false;
  });

  return (
    <View style={[styles.wrap, { borderRadius: radius.md }]}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        allowsFullscreen
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 260, height: 160, overflow: 'hidden', backgroundColor: '#000', marginTop: 4 },
  video: { width: '100%', height: '100%' },
});
