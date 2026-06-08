/**
 * Emoji detection + Google Noto Animated Emoji utilities — ported 1:1 from the
 * web (src/lib/emoji.ts) so emoji-only messages render the same "live" animated
 * emoji at the same sizes.
 */

const graphemeSegmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('en', { granularity: 'grapheme' })
    : null;

/** Detects whether text is only emoji (1–3), using grapheme segmentation. */
export function getEmojiInfo(text: string): {
  isEmojiOnly: boolean;
  count: number;
  emojis: string[];
} {
  const trimmed = text.trim();
  if (!trimmed) return { isEmojiOnly: false, count: 0, emojis: [] };

  try {
    const segmenter =
      graphemeSegmenter ?? new Intl.Segmenter('en', { granularity: 'grapheme' });
    const segments = Array.from(
      segmenter.segment(trimmed) as Iterable<{ segment: string }>
    );
    const emojis: string[] = [];

    for (const { segment } of segments) {
      if (/^\s+$/.test(segment)) continue;
      if (
        /\p{Emoji_Presentation}/u.test(segment) ||
        (/\p{Extended_Pictographic}/u.test(segment) && segment.length > 1)
      ) {
        emojis.push(segment);
      } else {
        return { isEmojiOnly: false, count: 0, emojis: [] };
      }
    }

    return {
      isEmojiOnly: emojis.length > 0 && emojis.length <= 3,
      count: emojis.length,
      emojis,
    };
  } catch {
    const emojiRegex =
      /(\p{Emoji_Presentation}|\p{Emoji}️)(\p{Emoji_Modifier}|‍(\p{Emoji_Presentation}|\p{Emoji}️))*/gu;
    const matches = trimmed.match(emojiRegex);
    if (!matches) return { isEmojiOnly: false, count: 0, emojis: [] };
    const stripped = trimmed.replace(emojiRegex, '').trim();
    if (stripped.length > 0) return { isEmojiOnly: false, count: 0, emojis: [] };
    return {
      isEmojiOnly: matches.length <= 3,
      count: matches.length,
      emojis: matches,
    };
  }
}

/** Google Noto Animated Emoji CDN URL (animated .webp) for an emoji. */
export function emojiToNotoAnimatedUrl(emoji: string): string {
  const codepoints = Array.from(emoji)
    .map((char) => char.codePointAt(0)!.toString(16).toLowerCase())
    .join('_');
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoints}/512.webp`;
}

/** Emoji render size by count: 1 → 80, 2 → 64, 3 → 52 (matches web). */
export function getEmojiSize(count: number): number {
  if (count === 1) return 80;
  if (count === 2) return 64;
  return 52;
}
