import 'react-native-url-polyfill/auto';

import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { config } from './config';
import { secureStorage } from './secure-storage';

/**
 * Storage adapter chosen per platform:
 *   - native (iOS/Android): encrypted SecureStore-backed storage.
 *   - web/SSR: localStorage when a browser `window` exists, otherwise a no-op
 *     so server-side rendering (Node, where `window` is undefined) never throws.
 * The app targets native; this just keeps `expo start`'s web target from
 * crashing the dev server.
 */
const webStorage = {
  getItem: (key: string) =>
    typeof window !== 'undefined' ? window.localStorage.getItem(key) : null,
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

const storage = Platform.OS === 'web' ? webStorage : secureStorage;

/**
 * Supabase client for the mobile app. Used directly for:
 *   - Auth (signInWithPassword, getSession, onAuthStateChange, refresh)
 *   - Realtime subscriptions (messages, typing, presence) — RLS protected
 *
 * All business-data reads/writes go through the Next.js API (see lib/api.ts),
 * NOT this client, because the heavy RPCs are service_role-only.
 */
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection on native (that's a web/OAuth concern).
    detectSessionInUrl: false,
  },
});

// Pause/resume Supabase's automatic token refresh with app foreground state —
// recommended by the Supabase React Native guide to avoid refresh churn while
// backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
