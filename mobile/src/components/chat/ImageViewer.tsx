import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useDialog } from '@/components/ui/DialogProvider';
import { haptics } from '@/lib/haptics';
import { saveImageToGallery } from '@/lib/download';
import { useTheme } from '@/theme/ThemeProvider';

/** Minimal shape the viewer needs — MessageFile is structurally compatible. */
export type ViewerImage = { id: string; file_url: string; file_name: string };

const { width, height } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120;
const THUMB = 52;
const THUMB_GAP = 8;

/**
 * Full-screen image carousel: swipe left/right between all images in a message,
 * pinch / double-tap to zoom, swipe down (only at 1x) to close, tappable
 * thumbnail strip at the bottom, and a download-to-gallery button up top.
 * Mirrors the web ImageLightbox behaviour but driven entirely by gestures.
 */
export function ImageViewer({
  files,
  initialIndex,
  visible,
  onClose,
}: {
  files: ViewerImage[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const dialog = useDialog();
  const [index, setIndex] = useState(initialIndex);
  /** Disabled while the active image is zoomed so panning doesn't page. */
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const pagerRef = useRef<FlatList<ViewerImage>>(null);
  const stripRef = useRef<FlatList<ViewerImage>>(null);
  /** Shared vertical drag for swipe-to-dismiss (active page only). */
  const dismissY = useSharedValue(0);

  const multiple = files.length > 1;
  const current = files[index];

  // Re-open at the tapped image every time the viewer becomes visible.
  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setScrollEnabled(true);
      dismissY.value = 0;
    }
  }, [visible, initialIndex, dismissY]);

  // Keep the active thumbnail centred as the page changes.
  useEffect(() => {
    if (visible && multiple) {
      stripRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [index, visible, multiple]);

  const close = useCallback(() => {
    dismissY.value = withTiming(0);
    onClose();
  }, [dismissY, onClose]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setIndex(first.index);
        setScrollEnabled(true);
      }
    },
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const goToIndex = useCallback((i: number) => {
    haptics.selection();
    pagerRef.current?.scrollToIndex({ index: i, animated: true });
  }, []);

  const handleDownload = useCallback(async () => {
    if (saving || !current) return;
    setSaving(true);
    const res = await saveImageToGallery(current.file_url, current.file_name);
    setSaving(false);
    if (res.ok) {
      haptics.success();
      dialog.alert({
        title: 'Saved',
        message: 'Image saved to your gallery.',
        icon: 'checkmark-circle-outline',
      });
    } else if (res.reason === 'permission') {
      haptics.error();
      dialog.alert({
        title: 'Permission needed',
        message: 'Allow photo access to save images to your gallery.',
        icon: 'images-outline',
      });
    } else {
      haptics.error();
      dialog.alert({
        title: 'Download failed',
        message: 'Could not save the image. Please try again.',
        icon: 'alert-circle-outline',
      });
    }
  }, [saving, current, dialog]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(dismissY.value),
      [0, DISMISS_THRESHOLD * 2],
      [1, 0.2],
      'clamp',
    ),
  }));

  const renderPage = useCallback(
    ({ item, index: i }: { item: ViewerImage; index: number }) => (
      <ZoomablePage
        uri={item.file_url}
        isActive={i === index}
        dismissY={dismissY}
        onZoomChange={(z) => setScrollEnabled(!z)}
        onClose={close}
      />
    ),
    [index, dismissY, close],
  );

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

        {/* Pager */}
        <FlatList
          key={`pager-${initialIndex}-${visible}`}
          ref={pagerRef}
          data={files}
          renderItem={renderPage}
          keyExtractor={(f) => f.id}
          horizontal
          pagingEnabled
          scrollEnabled={scrollEnabled && multiple}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
        />

        {/* Top bar */}
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.iconBtn} />

          {multiple ? (
            <Text style={styles.counter}>
              {index + 1} / {files.length}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}

          <Pressable onPress={handleDownload} hitSlop={10} style={styles.iconBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="download" size={22} color="#fff" />
            )}
          </Pressable>
        </View>

        {/* Thumbnail strip */}
        {multiple && (
          <View style={styles.strip} pointerEvents="box-none">
            <FlatList
              ref={stripRef}
              data={files}
              keyExtractor={(f) => `t-${f.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stripContent}
              getItemLayout={(_, i) => ({
                length: THUMB + THUMB_GAP,
                offset: (THUMB + THUMB_GAP) * i,
                index: i,
              })}
              renderItem={({ item, index: i }) => {
                const active = i === index;
                return (
                  <Pressable onPress={() => goToIndex(i)}>
                    <Image
                      source={{ uri: item.file_url }}
                      style={[
                        styles.thumb,
                        active
                          ? { borderColor: colors.primary, opacity: 1, transform: [{ scale: 1.06 }] }
                          : { borderColor: 'transparent', opacity: 0.5 },
                      ]}
                      contentFit="cover"
                      alt="thumbnail"
                    />
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

/** A single full-screen image page with pinch/double-tap zoom + dismiss drag. */
function ZoomablePage({
  uri,
  isActive,
  dismissY,
  onZoomChange,
  onClose,
}: {
  uri: string;
  isActive: boolean;
  dismissY: SharedValue<number>;
  onZoomChange: (zoomed: boolean) => void;
  onClose: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    sx.value = 0;
    sy.value = 0;
    setZoomed(false);
    onZoomChange(false);
  }, [scale, savedScale, tx, ty, sx, sy, onZoomChange]);

  // Reset zoom whenever this page scrolls off-screen.
  useEffect(() => {
    if (!isActive && zoomed) resetZoom();
  }, [isActive, zoomed, resetZoom]);

  const setZoomedJS = useCallback(
    (z: boolean) => {
      setZoomed(z);
      onZoomChange(z);
    },
    [onZoomChange],
  );

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = Math.max(1, savedScale.value * e.scale);
      })
      .onEnd(() => {
        savedScale.value = scale.value;
        if (scale.value <= 1) {
          tx.value = withTiming(0);
          ty.value = withTiming(0);
          sx.value = 0;
          sy.value = 0;
        }
        runOnJS(setZoomedJS)(scale.value > 1);
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
          runOnJS(setZoomedJS)(false);
        } else {
          scale.value = withTiming(2.5);
          savedScale.value = 2.5;
          runOnJS(setZoomedJS)(true);
        }
      });

    // Pan the image — only while zoomed.
    const imagePan = Gesture.Pan()
      .enabled(zoomed)
      .onUpdate((e) => {
        tx.value = sx.value + e.translationX;
        ty.value = sy.value + e.translationY;
      })
      .onEnd(() => {
        sx.value = tx.value;
        sy.value = ty.value;
      });

    // Swipe down to dismiss — only at 1x; horizontal drags fall through to the
    // pager so they page between images.
    const dismissPan = Gesture.Pan()
      .enabled(!zoomed)
      .activeOffsetY([-14, 14])
      .failOffsetX([-18, 18])
      .onUpdate((e) => {
        dismissY.value = e.translationY;
      })
      .onEnd((e) => {
        const shouldDismiss =
          Math.abs(dismissY.value) > DISMISS_THRESHOLD || Math.abs(e.velocityY) > 800;
        if (shouldDismiss) {
          dismissY.value = withTiming(dismissY.value > 0 ? height : -height, { duration: 200 });
          runOnJS(onClose)();
        } else {
          dismissY.value = withTiming(0);
        }
      });

    return Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, imagePan, dismissPan));
  }, [zoomed, scale, savedScale, tx, ty, sx, sy, dismissY, onClose, setZoomedJS]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: savedScale.value > 1 ? ty.value : dismissY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.page}>
        <Animated.View style={imageStyle}>
          <Image
            source={{ uri }}
            style={{ width, height: height * 0.8 }}
            contentFit="contain"
            alt="image"
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  page: { width, height, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  stripContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: THUMB_GAP,
    alignItems: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    borderWidth: 2,
  },
});
