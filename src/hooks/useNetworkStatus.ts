"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type NetworkState = "online" | "offline" | "reconnected";

/**
 * Tracks the browser's online/offline status in real-time.
 *
 * Returns:
 *  - `status`: "online" | "offline" | "reconnected"
 *  - `wasOffline`: true if user was offline at any point during this session
 *
 * "reconnected" is a transient state that lasts for a few seconds after
 * coming back online, so the UI can show a "Back online" banner.
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkState>("online");
  const wasOfflineRef = useRef(false);
  const reconnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOffline = useCallback(() => {
    wasOfflineRef.current = true;
    // Clear any pending reconnected timer
    if (reconnectedTimerRef.current) {
      clearTimeout(reconnectedTimerRef.current);
      reconnectedTimerRef.current = null;
    }
    setStatus("offline");
  }, []);

  const handleOnline = useCallback(() => {
    // Only show "reconnected" if we were actually offline
    if (wasOfflineRef.current) {
      setStatus("reconnected");

      // Auto-transition back to "online" after 3 seconds
      reconnectedTimerRef.current = setTimeout(() => {
        setStatus("online");
        reconnectedTimerRef.current = null;
      }, 3000);
    } else {
      setStatus("online");
    }
  }, []);

  useEffect(() => {
    // Set initial state
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
      setStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectedTimerRef.current) {
        clearTimeout(reconnectedTimerRef.current);
      }
    };
  }, [handleOnline, handleOffline]);

  return {
    status,
    isOffline: status === "offline",
    isReconnected: status === "reconnected",
    isOnline: status === "online",
  };
}
