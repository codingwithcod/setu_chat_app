/**
 * Platform feature flags stored in the `app_settings` table.
 *
 * Two readers:
 *  - app/admin/API code uses `getAppSettings(serviceClient)` for a fresh read.
 *  - the middleware uses `getCachedAppSettings(client)` which memoises the
 *    result for a few seconds so we don't hit the DB on every navigation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AppSettings {
  allow_registration: boolean;
  maintenance_mode: boolean;
}

const DEFAULTS: AppSettings = {
  allow_registration: true,
  maintenance_mode: false,
};

export async function getAppSettings(
  client: SupabaseClient
): Promise<AppSettings> {
  const { data } = await client.from("app_settings").select("key, value");
  const settings = { ...DEFAULTS };
  for (const row of data ?? []) {
    if (row.key in settings) {
      (settings as Record<string, boolean>)[row.key] = !!row.value;
    }
  }
  return settings;
}

// --- Short-lived cache for the hot middleware path ---
let cache: { value: AppSettings; expires: number } | null = null;
const TTL_MS = 15_000;

export async function getCachedAppSettings(
  client: SupabaseClient
): Promise<AppSettings> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.value;
  try {
    const value = await getAppSettings(client);
    cache = { value, expires: now + TTL_MS };
    return value;
  } catch {
    // On any failure, fail open with defaults — never lock people out.
    return cache?.value ?? DEFAULTS;
  }
}

export function invalidateAppSettingsCache() {
  cache = null;
}
