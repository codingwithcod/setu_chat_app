import { Image } from 'expo-image';
import { useState } from 'react';
import { Text } from 'react-native';

import { emojiToNotoAnimatedUrl } from '@/lib/emoji';

/**
 * Renders an emoji as Google's Noto Animated Emoji (a "live" animated .webp),
 * matching the web. Falls back to the large system emoji glyph if the animated
 * asset fails to load.
 */
export function AnimatedEmoji({ emoji, size = 80 }: { emoji: string; size?: number }) {
  const [fallback, setFallback] = useState(false);

  if (fallback) {
    return <Text style={{ fontSize: size, lineHeight: size * 1.1 }}>{emoji}</Text>;
  }

  return (
    <Image
      source={{ uri: emojiToNotoAnimatedUrl(emoji) }}
      alt={emoji}
      style={{ width: size, height: size }}
      contentFit="contain"
      onError={() => setFallback(true)}
    />
  );
}
