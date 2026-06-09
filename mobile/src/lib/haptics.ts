import * as Haptics from 'expo-haptics';

/**
 * Thin, fire-and-forget haptics wrapper. Every call is best-effort — haptics
 * are unavailable on web and some devices, so we swallow errors and never await.
 */
export const haptics = {
  /** Light tap — sends, attaches, reaction taps, row selection. */
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Medium tap — long-press menus, destructive confirmations. */
  medium: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Selection tick — segmented controls, theme switches. */
  selection: () => {
    Haptics.selectionAsync().catch(() => {});
  },
  /** Success notification — completed actions (group created, etc.). */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Error notification — failures. */
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
