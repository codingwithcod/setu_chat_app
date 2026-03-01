"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Hook that manages Browser Notification API.
 *
 * - Requests permission on mount (once)
 * - Tracks whether the document/tab is currently visible
 * - Provides `showNotification(title, body, conversationId)` that
 *   displays a native browser notification and navigates on click
 */
export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>("default");
  const isDocumentVisibleRef = useRef(true);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    permissionRef.current = Notification.permission;

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        permissionRef.current = permission;
      });
    }
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
   * Show a browser notification.
   * Returns true if notification was shown, false otherwise.
   */
  const showNotification = useCallback(
    (title: string, body: string, conversationId?: string) => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return false;
      }

      if (permissionRef.current !== "granted") {
        return false;
      }

      try {
        const notification = new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: conversationId || "setu-chat", // Group notifications by conversation
          silent: false,
        });

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
