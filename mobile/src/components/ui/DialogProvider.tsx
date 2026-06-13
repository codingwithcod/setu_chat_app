import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

type IconName = keyof typeof Ionicons.glyphMap;

export interface AlertOptions {
  title: string;
  message?: string;
  icon?: IconName;
  okLabel?: string;
  /** Tint the OK button (and icon) as destructive. */
  destructive?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  icon?: IconName;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tint the confirm button (and icon) as destructive. */
  destructive?: boolean;
}

interface DialogApi {
  /** Themed replacement for a single-button `Alert.alert`. Resolves on dismiss. */
  alert(opts: AlertOptions): Promise<void>;
  /** Themed yes/no dialog. Resolves `true` if confirmed, `false` otherwise. */
  confirm(opts: ConfirmOptions): Promise<boolean>;
}

type DialogButton = {
  label: string;
  variant: 'primary' | 'outline' | 'destructive';
  value: unknown;
};

interface DialogContent {
  title: string;
  message?: string;
  icon?: IconName;
  destructive?: boolean;
  buttons: DialogButton[];
}

const DialogContext = createContext<DialogApi | null>(null);

/** Imperative access to the themed dialog. Must be under <DialogProvider>. */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within a DialogProvider');
  return ctx;
}

const SPRING = { damping: 18, stiffness: 260, mass: 0.7 };

/**
 * App-wide themed dialog. Renders one centered card over a frosted backdrop and
 * exposes an imperative promise API (`alert` / `confirm`) via `useDialog()` so
 * we never fall back to the off-theme native `Alert`.
 */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { colors, radius, scheme } = useTheme();
  const [content, setContent] = useState<DialogContent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const resolverRef = useRef<((value: unknown) => void) | null>(null);
  const progress = useSharedValue(0);

  const settle = useCallback((value: unknown) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setVisible(false); // content stays mounted for the exit animation
  }, []);

  const alert = useCallback(
    (opts: AlertOptions) =>
      new Promise<void>((resolve) => {
        resolverRef.current = () => resolve();
        setContent({
          title: opts.title,
          message: opts.message,
          icon: opts.icon,
          destructive: opts.destructive,
          buttons: [
            {
              label: opts.okLabel ?? 'OK',
              variant: opts.destructive ? 'destructive' : 'primary',
              value: undefined,
            },
          ],
        });
        setVisible(true);
      }),
    [],
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = (v) => resolve(!!v);
        setContent({
          title: opts.title,
          message: opts.message,
          icon: opts.icon,
          destructive: opts.destructive,
          buttons: [
            { label: opts.cancelLabel ?? 'Cancel', variant: 'outline', value: false },
            {
              label: opts.confirmLabel ?? 'Confirm',
              variant: opts.destructive ? 'destructive' : 'primary',
              value: true,
            },
          ],
        });
        setVisible(true);
      }),
    [],
  );

  const api = useMemo<DialogApi>(() => ({ alert, confirm }), [alert, confirm]);

  // Enter/exit animation, mirroring ConfirmDialog.
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

  // Dismissing via backdrop / hardware back resolves with the first non-positive
  // button value (Cancel → false, or the alert's OK → undefined).
  const dismissValue = content
    ? (content.buttons.find((b) => b.value === false)?.value ?? undefined)
    : undefined;

  const accentKey = content?.destructive ? 'destructive' : 'primary';

  return (
    <DialogContext.Provider value={api}>
      {children}

      {mounted && content && (
        <Modal
          visible
          transparent
          statusBarTranslucent
          navigationBarTranslucent
          animationType="none"
          onRequestClose={() => settle(dismissValue)}
        >
          <View style={styles.center}>
            <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
              <BlurView
                intensity={18}
                tint={scheme === 'dark' ? 'dark' : 'light'}
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
              <Pressable
                style={[StyleSheet.absoluteFill, styles.dim]}
                onPress={() => settle(dismissValue)}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                Elevation.lg,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
                cardStyle,
              ]}
            >
              {content.icon && (
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.withAlpha(accentKey, 0.14) },
                  ]}
                >
                  <Ionicons
                    name={content.icon}
                    size={26}
                    color={content.destructive ? colors.destructive : colors.primary}
                  />
                </View>
              )}

              <Text style={[styles.title, { color: colors.foreground }]}>{content.title}</Text>
              {!!content.message && (
                <Text style={[styles.message, { color: colors.mutedForeground }]}>
                  {content.message}
                </Text>
              )}

              <View style={styles.actions}>
                {content.buttons.map((b) => (
                  <View key={b.label} style={styles.flex}>
                    <Button label={b.label} variant={b.variant} onPress={() => settle(b.value)} />
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </DialogContext.Provider>
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
