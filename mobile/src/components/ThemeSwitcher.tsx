import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { glow, hsl, mixBlack } from '@/theme/theme';
import type { ThemeModePreference } from '@/theme/theme';

const MODES: { id: ThemeModePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/** Appearance controls: light/dark/system mode + a live gradient theme picker. */
export function ThemeSwitcher() {
  const { colors, radius, mode, setMode, preset, setPreset, presets } = useTheme();

  const active = presets.find((p) => p.id === preset) ?? presets[0];
  const heroGrad: [string, string] = [colors.primary, colors.primaryGradientEnd];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.section, { color: colors.mutedForeground }]}>MODE</Text>
      <View style={[styles.segment, { backgroundColor: colors.secondary, borderRadius: radius.md }]}>
        {MODES.map((m) => {
          const on = mode === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                haptics.selection();
                setMode(m.id);
              }}
              style={[
                styles.segmentItem,
                { borderRadius: radius.sm },
                on && { backgroundColor: colors.background },
              ]}
            >
              <Ionicons
                name={m.icon}
                size={18}
                color={on ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={{
                  color: on ? colors.foreground : colors.mutedForeground,
                  fontWeight: on ? '700' : '500',
                  fontSize: 13,
                }}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground, marginTop: 18 }]}>
        COLOR THEME
      </Text>

      {/* Live preview — morphs to the active theme's gradient */}
      <View
        style={[
          styles.hero,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg },
        ]}
      >
        {/* Decorative corner glow */}
        <LinearGradient
          colors={[colors.withAlpha('primary', 0.22), 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroWash}
          pointerEvents="none"
        />

        {/* Received bubble — matches the real chat (colors.muted) */}
        <View style={[styles.recvBubble, { backgroundColor: colors.muted }]}>
          <Text style={[styles.recvText, { color: colors.foreground }]}>Hey! 👋</Text>
        </View>

        {/* Sent bubble — the exact gradient the chat uses (colors.bubbleOwn) */}
        <LinearGradient
          colors={colors.bubbleOwn}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.sentBubble}
        >
          <Text style={[styles.sentText, { color: colors.bubbleOwnText }]}>
            Love this theme 🔥
          </Text>
        </LinearGradient>

        {/* Mini input mock with gradient send orb */}
        <View style={styles.heroInputRow}>
          <View style={[styles.heroInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Message…</Text>
          </View>
          <LinearGradient
            colors={heroGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroSend, glow(colors.primary, 'sm')]}
          >
            <Feather name="send" size={15} color={colors.primaryForeground} />
          </LinearGradient>
        </View>

        <Text style={[styles.heroLabel, { color: colors.foreground }]}>
          {active.name}
          <Text style={{ color: colors.mutedForeground, fontWeight: '500' }}>
            {'  ·  '}
            {active.description}
          </Text>
        </Text>
      </View>

      {/* Gradient chips */}
      <View style={styles.chipRow}>
        {presets.map((p) => {
          const on = preset === p.id;
          // Pure single-hue orb (light → primary → deeper shade) so each dot
          // reads as a clear gradient in its true identity color — no drift
          // toward primaryGradientEnd.
          const grad: [string, string, string] = [
            hsl(p.variables.primaryLight),
            hsl(p.variables.primary),
            mixBlack(p.variables.primary, 60),
          ];
          const tint = hsl(p.variables.primary);
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                haptics.selection();
                setPreset(p.id);
              }}
              style={styles.chip}
            >
              <View
                style={[
                  styles.chipRing,
                  {
                    borderColor: on ? tint : 'transparent',
                    transform: [{ scale: on ? 1 : 0.92 }],
                  },
                  on && glow(tint, 'sm'),
                ]}
              >
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chipOrb}
                >
                  {on && (
                    <Ionicons
                      name="checkmark"
                      size={22}
                      color={hsl(p.variables.primaryForeground)}
                    />
                  )}
                </LinearGradient>
              </View>
              <Text
                numberOfLines={1}
                style={{
                  color: on ? colors.foreground : colors.mutedForeground,
                  fontWeight: on ? '700' : '500',
                  fontSize: 12,
                }}
              >
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  segment: { flexDirection: 'row', padding: 4, gap: 4 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },

  hero: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: 'hidden',
    gap: 8,
  },
  heroWash: { ...StyleSheet.absoluteFillObject },
  recvBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomLeftRadius: 5,
  },
  recvText: { fontSize: 14, fontWeight: '500' },
  sentBubble: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomRightRadius: 5,
  },
  sentText: { fontSize: 14, fontWeight: '600' },
  heroInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroInput: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  heroSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { fontSize: 15, fontWeight: '800', marginTop: 4 },

  chipRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  chip: { alignItems: 'center', gap: 8, flex: 1 },
  chipRing: {
    padding: 3,
    borderRadius: 34,
    borderWidth: 2,
  },
  chipOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
