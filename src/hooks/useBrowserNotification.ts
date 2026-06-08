"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Detect if running inside a Tauri desktop app.
 */
function isTauriEnv(): boolean {
  return (
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
  );
}

/**
 * Show a notification using Tauri's native notification plugin.
 * Dynamically imports the plugin to avoid issues on web.
 */
async function showTauriNotification(
  title: string,
  body: string
): Promise<boolean> {
  try {
    const {
      isPermissionGranted,
      requestPermission,
      sendNotification,
    } = await import("@tauri-apps/plugin-notification");

    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      sendNotification({ title, body });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Tauri notification failed:", error);
    return false;
  }
}

/**
 * Hook that manages notifications across Web and Tauri Desktop.
 *
 * - In Tauri: Uses native OS notifications (Windows Toast)
 * - In Browser: Uses the Browser Notification API
 * - Tracks whether the document/tab is currently visible
 * - Shows notification with sender name + message preview
 * - Clicking browser notification navigates to the chat
 */
export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>("default");
  const isDocumentVisibleRef = useRef(true);

  // Request notification permission (browser only — Tauri handles its own).
  //
  // Requesting only on mount is unreliable: Safari and Firefox REQUIRE a user
  // gesture to show the permission prompt, and some browsers (notably Chrome in
  // Incognito) silently ignore a gesture-less request. That's the main reason
  // notifications appear "sometimes" and not at all in an Incognito window that
  // never granted permission. So we try immediately (works in Chrome normal
  // windows) AND arm a one-time first-gesture fallback that covers the rest.
  useEffect(() => {
    if (isTauriEnv()) return; // Tauri handles permission on first use
    if (typeof window === "undefined" || !("Notification" in window)) return;

    permissionRef.current = Notification.permission;
    if (Notification.permission !== "default") return; // already granted/denied

    const ask = () => {
      try {
        Notification.requestPermission().then((permission) => {
          permissionRef.current = permission;
        });
      } catch {
        // Older browsers throw on the promise form — ignore.
      }
    };

    // Immediate attempt (Chrome normal windows honor this).
    ask();

    // First-gesture fallback for browsers that require a user interaction.
    const onGesture = () => {
      if (Notification.permission === "default") ask();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  // Track document visibility (tab focused / not focused)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      isDocumentVisibleRef.current = !document.hidden;
    };

    // Set initial state
    isDocumentVisibleRef.current = !document.hidden;

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /**
   * Show a notification (auto-detects Tauri vs Browser).
   * Returns true if notification was shown, false otherwise.
   */
  const showNotification = useCallback(
    (title: string, body: string, conversationId?: string) => {
      // --- Tauri Desktop: Use native OS notification ---
      if (isTauriEnv()) {
        showTauriNotification(title, body);
        return true;
      }

      // --- Browser: Use Notification API ---
      if (typeof window === "undefined" || !("Notification" in window)) {
        return false;
      }

      // Read the LIVE permission, not the cached ref — the ref can lag behind
      // a permission the user granted after mount, causing dropped notifications.
      permissionRef.current = Notification.permission;
      if (Notification.permission !== "granted") {
        return false;
      }

      try {
        const notification = new Notification(title, {
          body,
          icon: "/icons/setu-logo.png",
          badge: "/icons/setu-badge.png",
          tag: conversationId || "setu-chat",
          // renotify re-alerts (sound/vibrate) when another message arrives for
          // the same conversation tag, instead of silently replacing it.
          renotify: true,
          silent: false,
        } as NotificationOptions);

        // Navigate to the conversation on click
        notification.onclick = () => {
          window.focus();
          if (conversationId) {
            window.location.href = `/chat/${conversationId}`;
          }
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        return true;
      } catch (error) {
        console.error("Failed to show notification:", error);
        return false;
      }
    },
    []
  );

  return {
    showNotification,
    isDocumentVisibleRef,
    permissionRef,
  };
}
