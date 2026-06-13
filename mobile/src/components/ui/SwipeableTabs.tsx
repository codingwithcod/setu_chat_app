import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SegmentedTabs, type SegmentedTab } from './SegmentedTabs';

const WIDTH = Dimensions.get('window').width;

/**
 * A segmented control wired to a horizontally paged content area, so the user
 * can either tap a tab or swipe left/right between pages. `pages` must line up
 * 1:1 with `tabs`. Inner vertical lists scroll independently (different axis).
 */
export function SwipeableTabs<T extends string>({
  tabs,
  pages,
  tabBarStyle,
}: {
  tabs: SegmentedTab<T>[];
  pages: React.ReactNode[];
  tabBarStyle?: StyleProp<ViewStyle>;
}) {
  const [index, setIndex] = useState(0);
  const [height, setHeight] = useState(0);
  const ref = useRef<ScrollView>(null);
  /** True while a tap-driven animated scroll is in flight — suppresses the
   * intermediate-page highlight flicker as the pager scrolls past them. */
  const tapScrolling = useRef(false);

  const goTo = useCallback((i: number) => {
    tapScrolling.current = true;
    setIndex(i);
    ref.current?.scrollTo({ x: i * WIDTH, animated: true });
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (tapScrolling.current) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
    setIndex((prev) => (i !== prev ? i : prev));
  }, []);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    tapScrolling.current = false;
    const i = Math.round(e.nativeEvent.contentOffset.x / WIDTH);
    setIndex((prev) => (i !== prev ? i : prev));
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  }, []);

  return (
    <View style={styles.flex}>
      <View style={tabBarStyle}>
        <SegmentedTabs
          tabs={tabs}
          active={(tabs[index] ?? tabs[0]).key}
          onChange={(k) => goTo(tabs.findIndex((t) => t.key === k))}
        />
      </View>

      <View style={styles.flex} onLayout={onLayout}>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.flex}
        >
          {pages.map((page, i) => (
            <View key={tabs[i]?.key ?? i} style={{ width: WIDTH, height }}>
              {page}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
