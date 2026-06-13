import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Elevation } from '@/theme/theme';

export type SegmentedTab<T extends string> = {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** A premium pill segmented control — the active segment lifts onto a card. */
export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: SegmentedTab<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.muted }]}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => {
              if (t.key !== active) {
                haptics.selection();
                onChange(t.key);
              }
            }}
            style={[
              styles.tab,
              isActive && [{ backgroundColor: colors.card }, Elevation.sm],
            ]}
          >
            {t.icon && (
              <Ionicons
                name={t.icon}
                size={15}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
            )}
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 999,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
