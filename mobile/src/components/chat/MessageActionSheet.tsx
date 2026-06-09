import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import type { MessageWithSender } from '@/types';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageActionSheetProps {
  message: MessageWithSender | null;
  isOwn: boolean;
  onClose: () => void;
  onReply: (m: MessageWithSender) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (m: MessageWithSender) => void;
  onDelete: (m: MessageWithSender) => void;
  onForward: (m: MessageWithSender) => void;
}

export function MessageActionSheet({
  message,
  isOwn,
  onClose,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onForward,
}: MessageActionSheetProps) {
  const { colors, radius } = useTheme();
  if (!message) return null;

  const canEdit = isOwn && message.message_type === 'text' && !message.is_deleted;
  const canCopy = !!message.content && !message.is_deleted;

  const Action = ({
    icon,
    label,
    color,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color?: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={() => {
        onPress();
        onClose();
      }}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? colors.secondary : 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={22} color={color ?? colors.foreground} />
      <Text style={[styles.actionLabel, { color: color ?? colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}
        >
          {!message.is_deleted && (
            <View style={[styles.emojiRow, { borderBottomColor: colors.border }]}>
              {QUICK_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    haptics.light();
                    onReact(message.id, e);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.emojiBtn,
                    pressed && { backgroundColor: colors.secondary },
                  ]}
                >
                  <Text style={styles.emoji}>{e}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!message.is_deleted && (
            <Action icon="arrow-undo-outline" label="Reply" onPress={() => onReply(message)} />
          )}
          {!message.is_deleted && (
            <Action icon="arrow-redo-outline" label="Forward" onPress={() => onForward(message)} />
          )}
          {canCopy && (
            <Action
              icon="copy-outline"
              label="Copy"
              onPress={() => Clipboard.setStringAsync(message.content ?? '')}
            />
          )}
          {canEdit && (
            <Action icon="create-outline" label="Edit" onPress={() => onEdit(message)} />
          )}
          {isOwn && !message.is_deleted && (
            <Action
              icon="trash-outline"
              label="Delete"
              color={colors.destructive}
              onPress={() => onDelete(message)}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheet: { overflow: 'hidden', paddingBottom: 8, marginBottom: 8 },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emojiBtn: { padding: 8, borderRadius: 24 },
  emoji: { fontSize: 26 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionLabel: { fontSize: 16, fontWeight: '500' },
});
