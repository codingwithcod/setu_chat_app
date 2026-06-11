import { BlurView } from 'expo-blur';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Elevation } from '@/theme/theme';
import { useTheme } from '@/theme/ThemeProvider';

const OFFSCREEN = 1000;
const SPRING = { damping: 24, stiffness: 260, mass: 0.7 };

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional title shown above the content. */
  title?: string;
}

/**
 * Frosted bottom sheet: springs up from the bottom over a blurred backdrop,
 * with a grab handle and drag-to-dismiss. Controlled via `visible`/`onClose`
 * (all dismissals route through onClose, so the exit animation always plays).
 * Built on Reanimated + gesture-handler — no extra dependency, Expo-Go safe.
 */
export function Sheet({ visible, onClose, children, title }: SheetProps) {
  const { colors, scheme, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);

  const translateY = useSharedValue(OFFSCREEN);
  const progress = useSharedValue(0);
  const sheetH = useSharedValue(OFFSCREEN);

  // Mount on open; on close, play the exit then unmount.
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(sheetH.value || OFFSCREEN, { duration: 200 }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Spring in once mounted.
  useEffect(() => {
    if (mounted && visible) {
      translateY.value = OFFSCREEN;
      translateY.value = withSpring(0, SPRING);
      progress.value = withTiming(1, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.flex}>
        {/* Frosted backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView
            intensity={18}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[styles.wrap, sheetStyle]}
          onLayout={(e) => {
            sheetH.value = e.nativeEvent.layout.height;
          }}
        >
          <GestureDetector gesture={pan}>
            <View
              style={[
                styles.sheet,
                Elevation.lg,
                {
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: radius.xl,
                  borderTopRightRadius: radius.xl,
                  borderColor: colors.border,
                  paddingBottom: insets.bottom + 10,
                },
              ]}
            >
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              {title && (
                <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
              )}
              {children}
            </View>
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
});
