import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Touchable } from '@/components/ui/Touchable';
import { haptics } from '@/lib/haptics';
import { glow } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Centered "find people" prompt shown on the Chats screen when the user has only
 * a handful of conversations — a premium gradient call-to-action that takes them
 * to the Contacts tab to discover suggested people.
 */
export function SuggestedPeopleCard({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  // Same darker single-hue gradient as the logo (primary → deeper shades) so it
  // reads as the theme's true color — no drift toward primaryGradientEnd.
  const grad = colors.brandWordmarkGradient;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, glow(colors.primary, 'md')]}
      >
        <Ionicons name="sparkles" size={26} color={colors.primaryForeground} />
      </LinearGradient>

      <Text style={[styles.title, { color: colors.foreground }]}>Start connecting</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Discover suggested people and start your first conversations.
      </Text>

      <Touchable
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        style={styles.btnTouch}
      >
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, glow(colors.primary, 'sm')]}
        >
          <Ionicons name="people" size={18} color={colors.primaryForeground} />
          <Text style={[styles.btnLabel, { color: colors.primaryForeground }]}>
            See suggested
          </Text>
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </LinearGradient>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 21, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 10 },
  btnTouch: { borderRadius: 999 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    height: 52,
    borderRadius: 999,
  },
  btnLabel: { fontSize: 16, fontWeight: '700' },
});
