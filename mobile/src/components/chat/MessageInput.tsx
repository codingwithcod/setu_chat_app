import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';

import { Touchable } from '@/components/ui/Touchable';
import { haptics } from '@/lib/haptics';
import type { PickedAsset } from '@/lib/media';
import { glow } from '@/theme/theme';
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
  /** Staged attachments awaiting send. */
  attachments?: PickedAsset[];
  onRemoveAttachment?: (index: number) => void;
  uploading?: boolean;
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
  attachments = [],
  onRemoveAttachment,
  uploading = false,
}: MessageInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const hasAttachments = attachments.length > 0;

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

  const canSend = !!text.trim() || hasAttachments;

  const submit = () => {
    if (uploading) return;
    const value = text.trim();
    if (editing) {
      if (!value) return;
      onConfirmEdit?.(value);
    } else {
      if (!canSend) return;
      haptics.light();
      onSend(value); // screen reads staged attachments separately
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

      {hasAttachments && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tray}
          contentContainerStyle={styles.trayContent}
        >
          {attachments.map((a, i) => (
            <View
              key={`${a.uri}-${i}`}
              style={[styles.thumb, { backgroundColor: colors.secondary }]}
            >
              {a.file_type === 'image' || a.file_type === 'video' ? (
                <Image source={{ uri: a.uri }} style={styles.thumbImg} contentFit="cover" alt={a.name} />
              ) : (
                <Ionicons
                  name={a.file_type === 'audio' ? 'musical-notes' : 'document'}
                  size={26}
                  color={colors.mutedForeground}
                />
              )}
              {a.file_type === 'video' && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={16} color="#fff" />
                </View>
              )}
              <Pressable
                onPress={() => onRemoveAttachment?.(i)}
                style={styles.removeBtn}
                hitSlop={6}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.row}>
        <View
          style={[
            styles.pill,
            { backgroundColor: colors.background, borderColor: colors.withAlpha('border', 0.9) },
          ]}
        >
          {!editing && (
            <Touchable onPress={onAttach} hitSlop={6} style={styles.iconBtn}>
              <Feather name="paperclip" size={21} color={colors.mutedForeground} />
            </Touchable>
          )}

          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              onType();
            }}
            placeholder="Message"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.input, { color: colors.foreground }, editing && styles.inputEditing]}
          />

          <Touchable onPress={() => setEmojiOpen(true)} hitSlop={6} style={styles.iconBtn}>
            <Feather name="smile" size={21} color={colors.mutedForeground} />
          </Touchable>

          <Touchable
            onPress={submit}
            haptic="none"
            disabled={!canSend || uploading}
            style={styles.sendWrap}
          >
            {canSend && !uploading ? (
              <LinearGradient
                colors={[colors.primary, colors.primaryGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.sendBtn, glow(colors.primary, 'sm')]}
              >
                <Feather name={editing ? 'check' : 'send'} size={18} color={colors.primaryForeground} />
              </LinearGradient>
            ) : (
              <View style={[styles.sendBtn, { backgroundColor: colors.secondary }]}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Feather name={editing ? 'check' : 'send'} size={18} color={colors.mutedForeground} />
                )}
              </View>
            )}
          </Touchable>
        </View>
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
  tray: { maxHeight: 88 },
  trayContent: { gap: 8, padding: 8, paddingBottom: 0 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
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
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  // Full-width pill holding the attachment, input, emoji and send — premium.
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 6,
    paddingRight: 5,
    paddingVertical: 5,
  },
  iconBtn: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingTop: 9,
    paddingBottom: 9,
    fontSize: 15.5,
  },
  // Editing hides the attachment button — keep the text padded from the edge.
  inputEditing: { paddingLeft: 12 },
  sendWrap: { marginLeft: 2 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
