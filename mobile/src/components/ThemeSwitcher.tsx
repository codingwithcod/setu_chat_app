import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeModePreference } from '@/theme/theme';

const MODES: { id: ThemeModePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/** Appearance controls: light/dark/system mode + the 3 color presets. */
export function ThemeSwitcher() {
  const { colors, radius, mode, setMode, preset, setPreset, presets } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.section, { color: colors.mutedForeground }]}>MODE</Text>
      <View style={[styles.segment, { backgroundColor: colors.secondary, borderRadius: radius.md }]}>
        {MODES.map((m) => {
          const active = mode === m.id;
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
                active && { backgroundColor: colors.background },
              ]}
            >
              <Ionicons
                name={m.icon}
                size={18}
                color={active ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={{
                  color: active ? colors.foreground : colors.mutedForeground,
                  fontWeight: active ? '700' : '500',
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
      <View style={{ gap: 10 }}>
        {presets.map((p) => {
          const active = preset === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                haptics.selection();
                setPreset(p.id);
              }}
              style={[
                styles.presetRow,
                {
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : 1,
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  paddingHorizontal: active ? 13 : 14,
                },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: p.swatch }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.presetName, { color: colors.foreground }]}>
                  {p.name}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {p.description}
                </Text>
              </View>
              {active && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
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
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  presetName: { fontSize: 16, fontWeight: '700' },
});
