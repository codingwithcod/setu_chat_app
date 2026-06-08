"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  registerServiceWorker,
  ensureWebPushSubscribed,
} from "@/lib/push/web-client";

/**
 * Registers the service worker and subscribes the browser to Web Push once the
 * user is logged in and notification permission is granted.
 *
 * Permission may be granted slightly after load (via the first-gesture prompt
 * in useBrowserNotification), so we try on mount AND on the first user gesture —
 * requesting permission inline if still undecided — then stop once subscribed.
 * Skipped inside the Tauri desktop shell, which uses native notifications.
 */
export function useWebPush() {
  const { user } = useAuthStore();
  const doneRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return;
    if ("__TAURI_INTERNALS__" in window) return; // native handles its own
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    doneRef.current = false;

    // Register the worker immediately (no permission needed) so push can be
    // delivered the moment a subscription exists.
    registerServiceWorker();

    const trySubscribe = async () => {
      if (doneRef.current) return;
      if (Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      }
      if (Notification.permission !== "granted") return;
      const ok = await ensureWebPushSubscribed();
      if (ok) {
        doneRef.current = true;
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
      }
    };

    const onGesture = () => {
      void trySubscribe();
    };

    // Attempt now (covers users who already granted permission)…
    void trySubscribe();
    // …and on the first interaction (covers the gesture-gated permission grant).
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [user?.id]);
}
