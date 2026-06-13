import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Visual height of the bottom tab bar (excluding the safe-area inset). */
export const TAB_BAR_HEIGHT = 74;

/**
 * Total tab-bar height including the bottom safe-area inset. Screens pad their
 * content by this so nothing hides under the floating glass bar — a drop-in
 * replacement for bottom-tabs' `useBottomTabBarHeight` (which isn't available
 * under the material-top-tabs navigator that powers swipeable tabs).
 */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom;
}
