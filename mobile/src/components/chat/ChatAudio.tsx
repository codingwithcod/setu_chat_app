import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { MessageFile } from '@/types';

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function ChatAudio({ file, onOwn }: { file: MessageFile; onOwn: boolean }) {
  const { colors } = useTheme();
  const player = useAudioPlayer(file.file_url);
  const status = useAudioPlayerStatus(player);

  const fg = onOwn ? colors.bubbleOwnText : colors.foreground;
  const sub = onOwn ? colors.bubbleOwnText : colors.mutedForeground;
  const duration = status.duration || 0;
  const position = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (duration > 0 && position >= duration - 0.2) player.seekTo(0);
      player.play();
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: onOwn ? 'rgba(0,0,0,0.18)' : colors.secondary },
      ]}
    >
      <Pressable
        onPress={toggle}
        style={[styles.playBtn, { backgroundColor: onOwn ? colors.bubbleOwnText : colors.primary }]}
      >
        <Ionicons
          name={status.playing ? 'pause' : 'play'}
          size={20}
          color={onOwn ? colors.bubbleOwn[0] : colors.primaryForeground}
        />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.name, { color: fg }]} numberOfLines={1}>
          {file.file_name}
        </Text>
        <View style={[styles.track, { backgroundColor: onOwn ? 'rgba(255,255,255,0.3)' : colors.border }]}>
          <View
            style={[
              styles.fill,
              { width: `${progress * 100}%`, backgroundColor: onOwn ? colors.bubbleOwnText : colors.primary },
            ]}
          />
        </View>
        <Text style={[styles.time, { color: sub, opacity: onOwn ? 0.7 : 1 }]}>
          {fmt(position)} / {fmt(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
    width: 250,
    marginTop: 4,
  },
  playBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 13, fontWeight: '600' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  time: { fontSize: 11 },
});
