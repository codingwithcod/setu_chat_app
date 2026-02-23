"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export function usePresence() {
  const { user, updateUser } = useAuthStore();

  const updateOnlineStatus = useCallback(
    async (isOnline: boolean) => {
      if (!user) return;
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq("id", user.id);

      updateUser({ is_online: isOnline });
    },
    [user, updateUser]
  );

  useEffect(() => {
    if (!user) return;

    // Set online on mount
    updateOnlineStatus(true);

    // Set offline on window close/unload
    const handleBeforeUnload = () => {
      const supabase = createClient();
      // Use sendBeacon for reliable offline status on page close
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
        JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
      );
      // Also attempt via supabase client
      supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", user.id);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Heartbeat to maintain online status
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        updateOnlineStatus(true);
      }
    }, 60000); // Every minute

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(heartbeat);
      updateOnlineStatus(false);
    };
  }, [user, updateOnlineStatus]);
}
