import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';

import { useTheme } from '@/theme/ThemeProvider';
import type { MessageWithSender } from '@/types';

interface MessageInputProps {
  onSend: (text: string) => void;
  onType: () => void;
  replyingTo?: MessageWithSender | null;
  onCancelReply?: () => void;
  /** Editing an existing message (shows confirm/cancel affordance). */
  editing?: MessageWithSender | null;
  onCancelEdit?: () => void;
  onConfirmEdit?: (text: string) => void;
  onAttach?: () => void;
}

export function MessageInput({
  onSend,
  onType,
  replyingTo,
  onCancelReply,
  editing,
  onCancelEdit,
  onConfirmEdit,
  onAttach,
}: MessageInputProps) {
  const { colors, radius } = useTheme();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);

  const pickEmoji = (e: EmojiType) => {
    setText((t) => t + e.emoji);
    onType();
  };

  const pickerTheme = {
    backdrop: '#00000066',
    knob: colors.primary,
    container: colors.card,
    header: colors.mutedForeground,
    skinTonesContainer: colors.secondary,
    category: {
      icon: colors.mutedForeground,
      iconActive: colors.primaryForeground,
      container: colors.secondary,
      containerActive: colors.primary,
    },
    search: {
      text: colors.foreground,
      placeholder: colors.mutedForeground,
      icon: colors.mutedForeground,
      background: colors.secondary,
    },
    emoji: { selected: colors.accent },
  };

  // When entering edit mode, prefill once.
  const [editingId, setEditingId] = useState<string | null>(null);
  if (editing && editing.id !== editingId) {
    setEditingId(editing.id);
    setText(editing.content ?? '');
  }
  if (!editing && editingId) {
    setEditingId(null);
    setText('');
  }

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    if (editing) {
      onConfirmEdit?.(value);
    } else {
      onSend(value);
    }
    setText('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {(replyingTo || editing) && (
        <View style={[styles.contextBar, { backgroundColor: colors.secondary }]}>
          <View style={[styles.contextAccent, { backgroundColor: colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contextTitle, { color: colors.primary }]}>
              {editing
                ? 'Editing message'
                : `Replying to ${replyingTo?.sender?.first_name ?? ''}`}
            </Text>
            <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
              {(editing ?? replyingTo)?.content ?? 'Attachment'}
            </Text>
          </View>
          <Pressable
            onPress={editing ? onCancelEdit : onCancelReply}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      <View style={styles.row}>
        {!editing && (
          <Pressable onPress={onAttach} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="add-circle-outline" size={28} color={colors.mutedForeground} />
          </Pressable>
        )}
        <Pressable onPress={() => setEmojiOpen(true)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="happy-outline" size={26} color={colors.mutedForeground} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onType();
          }}
          placeholder="Message"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[
            styles.input,
            { color: colors.foreground, backgroundColor: colors.background, borderRadius: radius.lg },
          ]}
        />
        <Pressable
          onPress={submit}
          disabled={!text.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: text.trim() ? colors.primary : colors.secondary },
          ]}
        >
          <Ionicons
            name={editing ? 'checkmark' : 'send'}
            size={20}
            color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onEmojiSelected={pickEmoji}
        enableSearchBar
        categoryPosition="top"
        theme={pickerTheme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: StyleSheet.hairlineWidth, paddingBottom: 6 },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 8,
    marginBottom: 0,
    borderRadius: 10,
  },
  contextAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  contextTitle: { fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  iconBtn: { paddingBottom: 8 },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15.5,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
