import 'react-native-url-polyfill/auto';

import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

import { config } from './config';
import { secureStorage } from './secure-storage';

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
    storage: secureStorage,
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
