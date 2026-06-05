/**
 * Runtime configuration, read from EXPO_PUBLIC_* env vars (see mobile/.env).
 * These are inlined into the JS bundle at build time, so only put values here
 * that are safe to expose to the client (Supabase publishable key, API URL).
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Add it to mobile/.env and restart Expo with --clear.`
    );
  }
  return value;
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
  /** Base URL of the Next.js API. Must be a LAN IP when testing on a device. */
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL).replace(
    /\/$/,
    ''
  ),
} as const;
