import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { api } from '@/lib/api';
import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface SignUpInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

/** Possible outcomes of the server-side Google callback processing. */
export interface GoogleCallbackResult {
  action: 'proceed' | 'select_username' | 'verify_totp' | 'blocked';
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  error?: string;
  message?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** True during the initial session restore. */
  initializing: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Signs in with Google OAuth via system browser and deep link. */
  signInWithGoogle: () => Promise<GoogleCallbackResult>;
  /** Registers the account; the user must then verify their email to log in. */
  signUp: (input: SignUpInput) => Promise<{ message: string }>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const currentUserId = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const data = await api.get<Profile>(`/api/users/${userId}`);
      setProfile(data);
    } catch {
      // Keep the session even if the profile fetch fails (e.g. transient
      // network); screens can retry via refreshProfile().
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Restore any persisted session on launch.
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!active) return;
        setSession(s);
        currentUserId.current = s?.user.id ?? null;
        // Unblock the splash as soon as the session is restored (a fast local
        // storage read). Don't wait on the profile network fetch — load it in
        // the background; screens render fine with profile === null and fill in.
        setInitializing(false);
        if (s?.user.id) loadProfile(s.user.id);
      })
      .catch(() => {
        // Never let a session-restore failure hang the splash forever.
        if (active) setInitializing(false);
      });

    // React to sign-in / sign-out / token refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const uid = s?.user.id ?? null;
      const changed = uid !== currentUserId.current;
      currentUserId.current = uid;
      if (uid && changed) loadProfile(uid);
      if (!uid) setProfile(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(error.message);
  }, []);

  /**
   * Google OAuth via system browser + deep link.
   *
   * Flow:
   *   1. Get OAuth URL from Supabase (skipBrowserRedirect)
   *   2. Open in system browser via WebBrowser.openAuthSessionAsync
   *   3. Supabase redirects to setu://callback#access_token=...&refresh_token=...
   *   4. Extract tokens, call supabase.auth.setSession()
   *   5. Call POST /api/auth/google-callback to run server-side logic
   *   6. Return action for the caller to navigate accordingly
   */
  const signInWithGoogle = useCallback(async (): Promise<GoogleCallbackResult> => {
    const redirectTo = Linking.createURL('callback');

    // 1. Get the OAuth URL from Supabase.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      throw new Error(error?.message ?? 'Failed to start Google sign-in.');
    }

    // 2. Open in the system browser.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success' || !result.url) {
      throw new Error('Google sign-in was cancelled.');
    }

    // 3. Extract tokens from the redirect URL.
    //    Supabase returns tokens in the URL fragment (#access_token=...&refresh_token=...)
    const url = result.url;
    const fragmentString = url.includes('#') ? url.split('#')[1] : '';
    const queryString = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';

    // Parse both fragment and query params — Supabase may use either depending on flow.
    const params = new URLSearchParams(fragmentString || queryString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) {
      // Could be PKCE code flow — try code exchange.
      const code = new URLSearchParams(queryString).get('code');
      if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (codeError) throw new Error(codeError.message);
      } else {
        throw new Error('No authentication tokens received from Google.');
      }
    } else {
      // 4. Set the session with the received tokens.
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      });
      if (sessionError) throw new Error(sessionError.message);
    }

    // 5. Call the server-side callback to process the Google login.
    const callbackResult = await api.post<GoogleCallbackResult>(
      '/api/auth/google-callback'
    );

    // If blocked, sign out immediately so the user can try again.
    if (callbackResult.action === 'blocked') {
      await supabase.auth.signOut({ scope: 'local' });
    }

    return callbackResult;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    return api.post<{ message: string }>('/api/auth/register', input);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return api.post<{ message: string }>('/api/auth/forgot-password', {
      email: email.trim(),
    });
  }, []);

  const signOut = useCallback(async () => {
    // Capture the current access token BEFORE tearing down the session, so the
    // push-unregister request below stays authenticated even though we clear the
    // session immediately.
    const token = session?.access_token;

    // Fire the push-unregister in the background — don't block the redirect on a
    // network round-trip (the server also prunes dead tokens on send).
    void unregisterPush(token);

    // Clear the session LOCALLY: this is instant (no server round-trip) and only
    // affects THIS device, so the auth listener flips to signed-out and the gate
    // redirects to login right away. The refresh token simply lapses on expiry.
    setProfile(null);
    await supabase.auth.signOut({ scope: 'local' });
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (currentUserId.current) await loadProfile(currentUserId.current);
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      initializing,
      isAuthenticated: !!session,
      signIn,
      signInWithGoogle,
      signUp,
      requestPasswordReset,
      signOut,
      refreshProfile,
    }),
    [session, profile, initializing, signIn, signInWithGoogle, signUp, requestPasswordReset, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
