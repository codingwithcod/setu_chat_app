import type { Session } from '@supabase/supabase-js';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
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
import { clearSessionToken } from '@/lib/session-manager';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

// ---------------------------------------------------------------------------
// Configure Google Sign-In once at module level.
// ---------------------------------------------------------------------------
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
});

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
  /** Signs in with Google OAuth via the native account picker. */
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
  // When true, a Google OAuth flow is in progress — the Supabase session may
  // already exist but we haven't validated it server-side yet.  Keep the auth
  // gate on the login screen until the callback resolves (mirrors the web's
  // single-redirect validation flow).
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState(false);
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
   * Google OAuth via the native Google Sign-In SDK.
   *
   * Flow:
   *   1. GoogleSignin.signIn() — shows the native account picker
   *   2. Get the idToken from the sign-in response
   *   3. Exchange idToken with Supabase via signInWithIdToken()
   *   4. Call POST /api/auth/google-callback to run server-side logic
   *   5. Return action for the caller to navigate accordingly
   */
  const signInWithGoogle = useCallback(async (): Promise<GoogleCallbackResult> => {
    // 1. Show the native Google account picker.
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new Error('Google sign-in was cancelled.');
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('No ID token received from Google.');
    }

    // Gate navigation: keep isAuthenticated false until the server-side
    // callback validates the login.  This prevents the brief flash where the
    // auth gate navigates to home before the callback returns "blocked".
    setPendingGoogleAuth(true);

    try {
      // 2. Exchange the Google idToken with Supabase for a session.
      //    onAuthStateChange will fire and set `session`, but isAuthenticated
      //    stays false because pendingGoogleAuth is true.
      const { error: sessionError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (sessionError) throw new Error(sessionError.message);

      // 3. Call the server-side callback to process the Google login.
      const callbackResult = await api.post<GoogleCallbackResult>(
        '/api/auth/google-callback'
      );

      // If blocked, sign out of both Supabase and Google so the user can
      // pick a different account on the next attempt.
      if (callbackResult.action === 'blocked') {
        await supabase.auth.signOut({ scope: 'local' });
        try { await GoogleSignin.revokeAccess(); } catch {
          try { await GoogleSignin.signOut(); } catch { /* no-op */ }
        }
      }

      return callbackResult;
    } finally {
      // Always release the gate — whether the flow succeeded, was blocked,
      // or threw an error.  On success this lets isAuthenticated flip to
      // true and triggers navigation; on failure/blocked the session is
      // already cleared so isAuthenticated stays false.
      setPendingGoogleAuth(false);
    }
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
    await clearSessionToken();
    await supabase.auth.signOut({ scope: 'local' });

    // Revoke Google access so the native account picker always appears on the
    // next sign-in instead of auto-selecting the previous account.
    // revokeAccess() disconnects the app entirely, clearing any cached
    // credential; signOut() alone is NOT enough — the OS still remembers the
    // previously selected account.
    try {
      await GoogleSignin.revokeAccess();
    } catch {
      // Fallback: at minimum sign out if revoke fails (e.g. network error).
      try { await GoogleSignin.signOut(); } catch { /* no-op */ }
    }
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (currentUserId.current) await loadProfile(currentUserId.current);
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      initializing,
      isAuthenticated: !!session && !pendingGoogleAuth,
      signIn,
      signInWithGoogle,
      signUp,
      requestPasswordReset,
      signOut,
      refreshProfile,
    }),
    [session, profile, initializing, pendingGoogleAuth, signIn, signInWithGoogle, signUp, requestPasswordReset, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
