import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Touchable } from '@/components/ui/Touchable';
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
  const { colors } = useTheme();

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
    <Touchable onPress={onPress} style={styles.item}>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
    </Touchable>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Attach">
      <Item icon="images" label="Photo & Video Library" color="#a855f7" onPress={() => run(pickFromLibrary)} />
      <Item icon="camera" label="Camera" color="#ec4899" onPress={() => run(captureWithCamera)} />
      <Item icon="document" label="File" color="#3b82f6" onPress={() => run(pickDocument)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 20 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
});
