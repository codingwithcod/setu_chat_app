/**
 * Heartbeat-based presence.
 *
 * An open tab refreshes its own `profiles.last_seen` every
 * `PRESENCE_HEARTBEAT_MS`. A user is considered ONLINE only if their stored
 * `is_online` flag is set AND their `last_seen` is fresher than
 * `PRESENCE_TTL_MS`.
 *
 * Why derive online from `last_seen` instead of trusting the `is_online`
 * boolean directly: the boolean is only flipped to `false` by client events
 * (tab hidden, sign out, unload beacon). A hard browser close, a crash, a
 * laptop sleep, or a dropped network connection never fire those reliably — so
 * the flag gets stuck at `true` forever (the "online for a week" bug). By
 * gating on `last_seen` freshness, a user automatically falls offline once
 * their heartbeats stop, with no dependency on any unload event firing.
 *
 * TTL is set to 2.5x the heartbeat so a single delayed/missed heartbeat (slow
 * network, brief tab throttle) does NOT cause a false "offline" flicker.
 */
export const PRESENCE_HEARTBEAT_MS = 30_000;
export const PRESENCE_TTL_MS = 75_000;

type PresenceProfile = {
  is_online?: boolean | null;
  last_seen?: string | null;
} | null | undefined;

/**
 * Returns whether a profile should be shown as online right now.
 *
 * @param profile  Object holding `is_online` and `last_seen`.
 * @param now      Current time in ms. Pass a ticking value (see `useNow`) so
 *                 the result re-evaluates over time without re-fetching.
 */
export function isUserOnline(profile: PresenceProfile, now: number = Date.now()): boolean {
  if (!profile?.is_online) return false;
  // No timestamp to compare against — trust the flag rather than regress.
  if (!profile.last_seen) return true;
  const last = new Date(profile.last_seen).getTime();
  if (Number.isNaN(last)) return true;
  return now - last < PRESENCE_TTL_MS;
}
