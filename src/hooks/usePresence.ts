"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { PRESENCE_HEARTBEAT_MS } from "@/lib/presence";

export function usePresence() {
  const { user } = useAuthStore();
  const userIdRef = useRef<string | null>(null);

  // Keep userIdRef in sync without causing re-renders
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const supabase = createClient();

    // Set online on mount — fire and forget, no state update needed
    supabase
      .from("profiles")
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq("id", userId)
      .then();

    // Set offline on window close/unload
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        JSON.stringify({
          is_online: false,
          last_seen: new Date().toISOString(),
        })
      );
    };

    const handleVisibilityChange = () => {
      if (!userIdRef.current) return;
      const isOnline = !document.hidden;
      supabase
        .from("profiles")
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq("id", userIdRef.current)
        .then();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Heartbeat to keep last_seen fresh while the tab is open. Other clients
    // treat a user as offline once last_seen goes stale (see isUserOnline), so
    // this interval MUST stay well under PRESENCE_TTL_MS or peers would flicker
    // offline between beats.
    const heartbeat = setInterval(() => {
      if (!document.hidden && userIdRef.current) {
        supabase
          .from("profiles")
          .update({
            is_online: true,
            last_seen: new Date().toISOString(),
          })
          .eq("id", userIdRef.current)
          .then();
      }
    }, PRESENCE_HEARTBEAT_MS);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(heartbeat);

      // Set offline on cleanup
      supabase
        .from("profiles")
        .update({
          is_online: false,
          last_seen: new Date().toISOString(),
        })
        .eq("id", userId)
        .then();
    };
    // Only depend on user.id — NOT the entire user object
  }, [user?.id]);
}
