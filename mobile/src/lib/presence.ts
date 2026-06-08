/**
 * Online-status logic, ported from the web (src/lib/presence.ts).
 * A user is "online" only if their is_online flag is set AND their last_seen
 * heartbeat is fresher than the TTL (so a stale flag from a crashed client
 * doesn't keep them green forever).
 */

export const PRESENCE_HEARTBEAT_MS = 30_000; // 30s
export const PRESENCE_TTL_MS = 75_000; // 2.5x heartbeat

export function isUserOnline(
  profile: { is_online?: boolean | null; last_seen?: string | null } | null | undefined
): boolean {
  if (!profile?.is_online) return false;
  if (!profile.last_seen) return true;
  const last = new Date(profile.last_seen).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last < PRESENCE_TTL_MS;
}
