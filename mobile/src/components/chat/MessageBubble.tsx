import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedEmoji } from '@/components/chat/AnimatedEmoji';
import { MessageStatus } from '@/components/chat/MessageStatus';
import { getEmojiInfo, getEmojiSize } from '@/lib/emoji';
import { formatMessageTime } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import type { MessageStatus as Status, MessageWithSender } from '@/types';

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  /** Show the sender's name (group chats, other people's messages). */
  showSender: boolean;
  status: Status;
  myId: string;
  onLongPress: (m: MessageWithSender) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onRetry?: (m: MessageWithSender) => void;
}

function MessageBubbleBase({
  message,
  isOwn,
  showSender,
  status,
  myId,
  onLongPress,
  onToggleReaction,
  onRetry,
}: MessageBubbleProps) {
  const { colors, radius } = useTheme();

  // Big "live" animated emoji for emoji-only messages (1–3 emojis), like web.
  const emojiInfo = useMemo(
    () =>
      message.content
        ? getEmojiInfo(message.content)
        : { isEmojiOnly: false, count: 0, emojis: [] as string[] },
    [message.content]
  );
  const bigEmoji =
    emojiInfo.isEmojiOnly &&
    !message.reply_message &&
    !message.forwarded_from &&
    !(message.files && message.files.length > 0);

  const textColor = isOwn ? colors.primaryForeground : colors.foreground;
  const metaColor = bigEmoji
    ? colors.mutedForeground
    : isOwn
      ? colors.primaryForeground
      : colors.mutedForeground;

  // Aggregate reactions by emoji.
  const reactionGroups = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of message.reactions ?? []) {
      const cur = map.get(r.reaction) ?? { count: 0, mine: false };
      cur.count += 1;
      if (r.user_id === myId) cur.mine = true;
      map.set(r.reaction, cur);
    }
    return [...map.entries()];
  }, [message.reactions, myId]);

  if (message.is_deleted) {
    return (
      <View style={[styles.wrap, isOwn ? styles.alignEnd : styles.alignStart]}>
        <View
          style={[
            styles.bubble,
            { backgroundColor: colors.secondary, borderRadius: radius.lg },
          ]}
        >
          <Text style={[styles.deleted, { color: colors.mutedForeground }]}>
            🚫 This message was deleted
          </Text>
        </View>
      </View>
    );
  }

  const senderColor = colors.tertiary;

  const bubbleStyle = [
    styles.bubble,
    {
      borderRadius: radius.lg,
      borderBottomRightRadius: isOwn ? 4 : radius.lg,
      borderBottomLeftRadius: isOwn ? radius.lg : 4,
    },
    bigEmoji && styles.bigEmojiBubble,
  ];

  const bubbleInner = (
    <>
      {showSender && !isOwn && (
        <Text style={[styles.sender, { color: senderColor }]} numberOfLines={1}>
          {message.sender?.first_name} {message.sender?.last_name}
        </Text>
      )}

      {message.forwarded_from && (
        <Text style={[styles.forwarded, { color: metaColor }]}>↪ Forwarded</Text>
      )}

      {message.reply_message && (
        <View
          style={[
            styles.reply,
            {
              backgroundColor: isOwn ? colors.replyOwnBg : colors.withAlpha('info', 0.1),
              borderLeftColor: isOwn ? colors.primaryLight : colors.info,
            },
          ]}
        >
          <Text style={[styles.replyName, { color: textColor }]} numberOfLines={1}>
            {message.reply_message.sender?.first_name ?? 'Reply'}
          </Text>
          <Text
            style={[
              styles.replyText,
              { color: isOwn ? 'rgba(255,255,255,0.78)' : colors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {message.reply_message.content ?? 'Attachment'}
          </Text>
        </View>
      )}

      {bigEmoji ? (
        <View style={styles.bigEmojiRow}>
          {emojiInfo.emojis.map((e, i) => (
            <AnimatedEmoji key={i} emoji={e} size={getEmojiSize(emojiInfo.count)} />
          ))}
        </View>
      ) : (
        !!message.content && (
          <Text style={[styles.content, { color: textColor }]}>{message.content}</Text>
        )
      )}

      <View style={styles.meta}>
        {message.is_edited && (
          <Text style={[styles.edited, { color: metaColor }]}>edited</Text>
        )}
        <Text style={[styles.time, { color: metaColor }]}>
          {formatMessageTime(message.created_at)}
        </Text>
        {isOwn &&
          (status === 'failed' ? (
            <Pressable onPress={() => onRetry?.(message)} hitSlop={8} style={styles.retry}>
              <Text style={styles.retryText}>Tap to retry</Text>
              <MessageStatus status={status} color={metaColor} />
            </Pressable>
          ) : (
            <MessageStatus status={status} color={metaColor} />
          ))}
      </View>
    </>
  );

  return (
    <View style={[styles.wrap, isOwn ? styles.alignEnd : styles.alignStart]}>
      <Pressable onLongPress={() => onLongPress(message)} delayLongPress={250}>
        {isOwn && !bigEmoji ? (
          <LinearGradient
            colors={colors.bubbleOwn}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={bubbleStyle}
          >
            {bubbleInner}
          </LinearGradient>
        ) : (
          <View
            style={[
              bubbleStyle,
              {
                backgroundColor: bigEmoji ? 'transparent' : colors.muted,
                borderWidth: bigEmoji || isOwn ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.withAlpha('border', 0.6),
              },
            ]}
          >
            {bubbleInner}
          </View>
        )}
      </Pressable>

      {reactionGroups.length > 0 && (
        <View style={[styles.reactions, isOwn ? styles.alignEnd : styles.alignStart]}>
          {reactionGroups.map(([emoji, info]) => (
            <Pressable
              key={emoji}
              onPress={() => onToggleReaction(message.id, emoji)}
              style={[
                styles.reactionPill,
                {
                  backgroundColor: info.mine ? colors.accent : colors.secondary,
                  borderColor: info.mine ? colors.primary : 'transparent',
                },
              ]}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {info.count > 1 && (
                <Text style={[styles.reactionCount, { color: colors.foreground }]}>
                  {info.count}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  wrap: { marginVertical: 3, paddingHorizontal: 12, maxWidth: '100%' },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8 },
  bigEmojiBubble: { paddingHorizontal: 0, paddingVertical: 2 },
  bigEmojiRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  sender: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  forwarded: { fontSize: 12, fontStyle: 'italic', marginBottom: 2 },
  content: { fontSize: 15.5, lineHeight: 21 },
  deleted: { fontSize: 14, fontStyle: 'italic' },
  reply: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    gap: 1,
  },
  replyName: { fontSize: 12.5, fontWeight: '700' },
  replyText: { fontSize: 12.5 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  edited: { fontSize: 11, fontStyle: 'italic' },
  time: { fontSize: 11 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retryText: { color: '#fb7185', fontSize: 11, fontWeight: '600' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 12, fontWeight: '600' },
});
