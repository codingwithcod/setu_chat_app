import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Static asset — require() is the React Native idiom for bundling images.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const whiteMark = require('../../assets/images/setu-white-tr.png');

type LogoSize = 'sm' | 'md' | 'lg';

const SIZES: Record<LogoSize, { tile: number; mark: number; font: number; radius: number; gap: number }> = {
  sm: { tile: 30, mark: 19, font: 18, radius: 9, gap: 8 },
  md: { tile: 38, mark: 24, font: 22, radius: 11, gap: 10 },
  lg: { tile: 60, mark: 38, font: 34, radius: 16, gap: 14 },
};

interface LogoProps {
  size?: LogoSize;
  /** Show the "Setu" gradient wordmark next to the mark. */
  wordmark?: boolean;
  style?: ViewStyle;
}

/**
 * The Setu brand lockup, theme-adaptive like the web navbar:
 *   - white logo mark on a `primary`-colored rounded tile
 *   - "Setu" wordmark filled with the theme gradient (primary-light → primary → tertiary)
 * Both recolor automatically when the active theme preset changes.
 */
export function Logo({ size = 'md', wordmark = true, style }: LogoProps) {
  const { colors } = useTheme();
  const s = SIZES[size];

  return (
    <View style={[styles.row, { gap: s.gap }, style]}>
      <View
        style={{
          width: s.tile,
          height: s.tile,
          borderRadius: s.radius,
          backgroundColor: colors.brandTile,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          source={whiteMark}
          alt="Setu logo"
          style={{ width: s.mark, height: s.mark }}
          contentFit="contain"
        />
      </View>

      {wordmark &&
        (colors.brandWordmark ? (
          // Solid wordmark (e.g. Midnight Black: white on dark / black on white).
          <Text
            style={{
              fontSize: s.font,
              fontWeight: '800',
              letterSpacing: -0.5,
              color: colors.brandWordmark,
            }}
          >
            Setu
          </Text>
        ) : (
          <GradientWordmark fontSize={s.font} colors={colors.gradient} />
        ))}
    </View>
  );
}

function GradientWordmark({
  fontSize,
  colors,
}: {
  fontSize: number;
  colors: [string, string, string];
}) {
  const textStyle = {
    fontSize,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  };
  return (
    <MaskedView maskElement={<Text style={textStyle}>Setu</Text>}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Invisible text sizes the gradient; the mask reveals the gradient
            only where the glyphs are. */}
        <Text style={[textStyle, { opacity: 0 }]}>Setu</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
