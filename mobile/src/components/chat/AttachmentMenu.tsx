import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  captureWithCamera,
  pickDocument,
  pickFromLibrary,
  type PickedAsset,
} from '@/lib/media';
import { useTheme } from '@/theme/ThemeProvider';

interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  onPicked: (assets: PickedAsset[], tooLarge: string[]) => void;
}

export function AttachmentMenu({ visible, onClose, onPicked }: AttachmentMenuProps) {
  const { colors, radius } = useTheme();

  const run = async (fn: () => Promise<{ assets: PickedAsset[]; tooLarge: string[] }>) => {
    onClose();
    const res = await fn();
    if (res.assets.length || res.tooLarge.length) onPicked(res.assets, res.tooLarge);
  };

  const Item = ({
    icon,
    label,
    color,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.secondary }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
          <Item icon="images" label="Photo & Video Library" color="#a855f7" onPress={() => run(pickFromLibrary)} />
          <Item icon="camera" label="Camera" color="#ec4899" onPress={() => run(captureWithCamera)} />
          <Item icon="document" label="File" color="#3b82f6" onPress={() => run(pickDocument)} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 12 },
  sheet: { paddingVertical: 8, marginBottom: 8, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 20 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
});
