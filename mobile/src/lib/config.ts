import Constants from 'expo-constants';

/**
 * Runtime configuration.
 *
 * Supabase values come from EXPO_PUBLIC_* env vars (safe to expose).
 *
 * The Next.js API URL is AUTO-DETECTED from the Metro dev-server host: in dev
 * the backend runs on the same machine as Metro, so we reuse that machine's
 * current LAN IP and just swap the port to 3000. This means a changing LAN IP
 * (DHCP) never breaks the app — no more editing .env. Set EXPO_PUBLIC_API_URL
 * to override (e.g. a remote/staging backend or a production build).
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Add it to mobile/.env and restart Expo with --clear.`
    );
  }
  return value;
}

/** The LAN host Metro is served from, e.g. "192.168.1.50" (null outside dev). */
function metroHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    // Fallbacks across Expo Go / dev-client shapes.
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } })
      .expoGoConfig?.debuggerHost,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) {
      const host = c.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
    }
  }
  return null;
}

function resolveApiUrl(): string {
  // Explicit override always wins.
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '');

  const port = process.env.EXPO_PUBLIC_API_PORT ?? '3000';
  const host = metroHost();
  if (host) return `http://${host}:${port}`;

  throw new Error(
    'Could not auto-detect the API host. Set EXPO_PUBLIC_API_URL in mobile/.env.'
  );
}

export const config = {
  supabaseUrl: required(
    'EXPO_PUBLIC_SUPABASE_URL',
    process.env.EXPO_PUBLIC_SUPABASE_URL
  ),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ),
  /** Base URL of the Next.js API (auto-detected from the Metro host in dev). */
  apiUrl: resolveApiUrl(),
} as const;
