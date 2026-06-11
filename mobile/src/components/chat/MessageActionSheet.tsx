import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/ui/Sheet';
import { Touchable } from '@/components/ui/Touchable';
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
  const { colors } = useTheme();
  // Retain the last message so content stays put during the close animation.
  const [shown, setShown] = useState<MessageWithSender | null>(message);
  useEffect(() => {
    if (message) setShown(message);
  }, [message]);

  const m = shown;
  const canEdit = !!m && isOwn && m.message_type === 'text' && !m.is_deleted;
  const canCopy = !!m && !!m.content && !m.is_deleted;

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
    <Touchable
      onPress={() => {
        onPress();
        onClose();
      }}
      style={styles.action}
    >
      <Ionicons name={icon} size={22} color={color ?? colors.foreground} />
      <Text style={[styles.actionLabel, { color: color ?? colors.foreground }]}>{label}</Text>
    </Touchable>
  );

  return (
    <Sheet visible={!!message} onClose={onClose}>
      {m && (
        <>
          {!m.is_deleted && (
            <View style={[styles.emojiRow, { borderBottomColor: colors.border }]}>
              {QUICK_EMOJIS.map((e) => (
                <Touchable
                  key={e}
                  haptic="none"
                  onPress={() => {
                    haptics.light();
                    onReact(m.id, e);
                    onClose();
                  }}
                  style={styles.emojiBtn}
                >
                  <Text style={styles.emoji}>{e}</Text>
                </Touchable>
              ))}
            </View>
          )}

          {!m.is_deleted && (
            <Action icon="arrow-undo-outline" label="Reply" onPress={() => onReply(m)} />
          )}
          {!m.is_deleted && (
            <Action icon="arrow-redo-outline" label="Forward" onPress={() => onForward(m)} />
          )}
          {canCopy && (
            <Action
              icon="copy-outline"
              label="Copy"
              onPress={() => Clipboard.setStringAsync(m.content ?? '')}
            />
          )}
          {canEdit && <Action icon="create-outline" label="Edit" onPress={() => onEdit(m)} />}
          {isOwn && !m.is_deleted && (
            <Action
              icon="trash-outline"
              label="Delete"
              color={colors.destructive}
              onPress={() => onDelete(m)}
            />
          )}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginBottom: 4,
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
