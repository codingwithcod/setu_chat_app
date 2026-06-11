import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Elevation } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  destructive?: boolean;
  /** Optional icon shown in a circle above the title. */
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

/**
 * Themed confirmation dialog — a centered card that springs in over a frosted
 * backdrop. Drop-in replacement for `Alert.alert` confirmations so they match
 * the app's look. Controlled via `visible`; the exit animation always plays.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, radius, scheme } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 140 }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (mounted && visible) {
      progress.value = 0;
      progress.value = withSpring(1, SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  if (!mounted) return null;

  const accent = destructive ? colors.destructive : colors.primary;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onCancel}>
      <View style={styles.center}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView
            intensity={18}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onCancel} />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            Elevation.lg,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
            cardStyle,
          ]}
        >
          {icon && (
            <View style={[styles.iconCircle, { backgroundColor: colors.withAlpha(destructive ? 'destructive' : 'primary', 0.14) }]}>
              <Ionicons name={icon} size={26} color={accent} />
            </View>
          )}
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {!!message && (
            <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
          )}
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label={cancelLabel} variant="outline" onPress={onCancel} />
            </View>
            <View style={styles.flex}>
              <Button
                label={confirmLabel}
                variant={destructive ? 'destructive' : 'primary'}
                onPress={onConfirm}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  dim: { backgroundColor: 'rgba(0,0,0,0.4)' },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 22, alignSelf: 'stretch' },
  flex: { flex: 1 },
});
