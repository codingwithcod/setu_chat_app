import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Dimensions, Modal, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;

/** Full-screen image with pinch-zoom, pan, double-tap, and swipe-down to close. */
export function ImageViewer({
  uri,
  visible,
  onClose,
}: {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  /** Tracks vertical drag for swipe-to-dismiss (only at scale 1). */
  const dismissY = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    sx.value = 0;
    sy.value = 0;
    dismissY.value = withTiming(0);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        tx.value = sx.value + e.translationX;
        ty.value = sy.value + e.translationY;
      } else {
        dismissY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        sx.value = tx.value;
        sy.value = ty.value;
      } else {
        const shouldDismiss =
          Math.abs(dismissY.value) > DISMISS_THRESHOLD ||
          Math.abs(e.velocityY) > 800;

        if (shouldDismiss) {
          dismissY.value = withTiming(
            dismissY.value > 0 ? height : -height,
            { duration: 200 },
          );
          runOnJS(close)();
        } else {
          dismissY.value = withTiming(0);
        }
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        sx.value = 0;
        sy.value = 0;
        dismissY.value = withTiming(0);
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: savedScale.value > 1 ? ty.value : dismissY.value },
      { scale: scale.value },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(dismissY.value),
      [0, DISMISS_THRESHOLD * 2],
      [1, 0.1],
      'clamp',
    ),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <StatusBar style="light" />
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <GestureDetector gesture={composed}>
          <Animated.View style={styles.center}>
            {uri && (
              <Animated.View style={imageStyle}>
                <Image
                  source={{ uri }}
                  style={{ width, height: height * 0.75 }}
                  contentFit="contain"
                  alt="image"
                />
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
