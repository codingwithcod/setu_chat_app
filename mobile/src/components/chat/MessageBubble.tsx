import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedEmoji } from '@/components/chat/AnimatedEmoji';
import { MessageMedia } from '@/components/chat/MessageMedia';
import { MessageStatus } from '@/components/chat/MessageStatus';
import { getEmojiInfo, getEmojiSize } from '@/lib/emoji';
import { haptics } from '@/lib/haptics';
import { formatMessageTime } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import type { MessageStatus as Status, MessageWithSender } from '@/types';

/** Drag distance (px) past which releasing opens the action menu. */
const SWIPE_TRIGGER = 60;
/** Hard cap on how far the bubble follows the finger. */
const SWIPE_MAX = 84;

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  /** Show the sender's name (group chats, other people's messages). */
  showSender: boolean;
  /** This message continues a run from the same sender — tuck it closer. */
  grouped?: boolean;
  /** Play a spring pop on appear (newly sent/received messages). */
  animateIn?: boolean;
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
  grouped = false,
  animateIn = false,
  status,
  myId,
  onLongPress,
  onToggleReaction,
  onRetry,
}: MessageBubbleProps) {
  const { colors, radius } = useTheme();

  // Spring-in pop for fresh messages. Runs via effect (not Reanimated
  // `entering`) so it fires reliably even on recycled FlashList cells.
  const pop = useSharedValue(animateIn ? 0 : 1);
  useEffect(() => {
    if (animateIn) {
      pop.value = 0;
      pop.value = withSpring(1, { damping: 15, stiffness: 220, mass: 0.6 });
    }
  }, [animateIn, pop]);
  const popStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.9 + pop.value * 0.1 }, { translateY: (1 - pop.value) * 8 }],
  }));

  // Swipe-left to reveal the message actions (reply / forward / edit / …).
  const openActions = useCallback(() => {
    haptics.medium();
    onLongPress(message);
  }, [onLongPress, message]);

  const swipeX = useSharedValue(0);
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          // Follow the finger rightward only, with a hard cap.
          swipeX.value = Math.min(Math.max(e.translationX, 0), SWIPE_MAX);
        })
        .onEnd(() => {
          if (swipeX.value >= SWIPE_TRIGGER) runOnJS(openActions)();
          swipeX.value = withSpring(0, { damping: 18, stiffness: 240 });
        }),
    [swipeX, openActions],
  );

  const swipeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: swipeX.value }] }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swipeX.value, [0, SWIPE_TRIGGER], [0, 1], 'clamp'),
  }));

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
          <Text
            numberOfLines={1}
            style={[styles.deleted, { color: colors.mutedForeground }]}
          >
            This message was deleted
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
      // Tuck the sender-side top corner when continuing a run — visually
      // stitches grouped bubbles together.
      borderTopRightRadius: isOwn && grouped ? 4 : radius.lg,
      borderTopLeftRadius: !isOwn && grouped ? 4 : radius.lg,
    },
    bigEmoji && styles.bigEmojiBubble,
    // Replies pack a quoted preview inside — give them a wider minimum so the
    // preview doesn't look cramped.
    !!message.reply_message && styles.replyBubble,
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

      {message.files && message.files.length > 0 && (
        <MessageMedia files={message.files} onOwn={isOwn} />
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
    <Animated.View
      style={[
        styles.wrap,
        isOwn ? styles.alignEnd : styles.alignStart,
        grouped && styles.grouped,
        popStyle,
      ]}
    >
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.swipeRow, swipeStyle]}>
          <Pressable onLongPress={openActions} delayLongPress={250}>
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

            {/* Options hint revealed as the bubble is swiped left. */}
            <Animated.View style={[styles.swipeHint, hintStyle]} pointerEvents="none">
              <View style={[styles.swipeHintCircle, { backgroundColor: colors.secondary }]}>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.mutedForeground} />
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </GestureDetector>

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
    </Animated.View>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  wrap: { marginVertical: 3, paddingHorizontal: 12, maxWidth: '100%' },
  grouped: { marginTop: 1 },
  alignEnd: { alignItems: 'flex-end' },
  alignStart: { alignItems: 'flex-start' },
  bubble: { minWidth: 88, paddingHorizontal: 12, paddingVertical: 8 },
  replyBubble: { minWidth: 140 },
  // The swipeable wrapper carries the width cap (kept off the inner bubble so
  // the %max resolves against the full-width row, not a shrink-wrapped parent).
  swipeRow: { maxWidth: '82%' },
  swipeHint: {
    position: 'absolute',
    right: '100%',
    marginRight: 10,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHintCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmojiBubble: { minWidth: 0, paddingHorizontal: 0, paddingVertical: 2 },
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
