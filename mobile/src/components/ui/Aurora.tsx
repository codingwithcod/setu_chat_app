import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Static asset — require() is the React Native idiom for bundling images.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GLOW = require('../../../assets/images/glow.png');

interface AuroraProps {
  /**
   * 'top'    — two brand-tinted blooms bleeding from the top corners (default;
   *            great behind headers and lists).
   * 'center' — a single soft bloom centered (great behind empty states).
   */
  variant?: 'top' | 'center';
  /** Overall strength multiplier (0–1). Default 1. */
  intensity?: number;
}

/**
 * Ambient aurora glow — soft, blurred brand-colored blooms behind content.
 * Purely decorative (pointerEvents none) and absolutely positioned, so it never
 * affects layout. Tints follow the active theme's primary + gradient-end, so it
 * works across all presets. Render it as the FIRST child of a screen so content
 * paints on top.
 */
export function Aurora({ variant = 'top', intensity = 1 }: AuroraProps) {
  const { colors } = useTheme();

  if (variant === 'center') {
    return (
      <View pointerEvents="none" style={styles.fill}>
        <Image
          source={GLOW}
          alt=""
          tintColor={colors.primary}
          style={[styles.centerBlob, { opacity: 0.16 * intensity }]}
        />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={[styles.fill, styles.clip]}>
      <Image
        source={GLOW}
        alt=""
        tintColor={colors.primary}
        style={[styles.blob, { top: -260, left: -170, opacity: 0.22 * intensity }]}
      />
      <Image
        source={GLOW}
        alt=""
        tintColor={colors.primaryGradientEnd}
        style={[styles.blob, { top: -320, right: -200, opacity: 0.15 * intensity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  clip: { overflow: 'hidden' },
  blob: { position: 'absolute', width: 540, height: 540 },
  centerBlob: {
    position: 'absolute',
    width: 620,
    height: 620,
    top: '12%',
    alignSelf: 'center',
  },
});
