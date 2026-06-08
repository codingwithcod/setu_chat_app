"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current time in ms, re-rendering the caller every `intervalMs`.
 *
 * Used to make derived presence (see `isUserOnline`) re-evaluate over time, so
 * a peer flips to "offline" once their heartbeats go stale — without needing a
 * fresh fetch or a realtime subscription on the profiles table.
 */
export function useNow(intervalMs = 20_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
