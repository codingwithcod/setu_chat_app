import type { Session } from '@supabase/supabase-js';
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

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** True during the initial session restore. */
  initializing: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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
        if (s?.user.id) loadProfile(s.user.id).finally(() => setInitializing(false));
        else setInitializing(false);
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

  const signUp = useCallback(async (input: SignUpInput) => {
    return api.post<{ message: string }>('/api/auth/register', input);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return api.post<{ message: string }>('/api/auth/forgot-password', {
      email: email.trim(),
    });
  }, []);

  const signOut = useCallback(async () => {
    // Remove this device's push registration while we're still authenticated.
    await unregisterPush();
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

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
      signUp,
      requestPasswordReset,
      signOut,
      refreshProfile,
    }),
    [session, profile, initializing, signIn, signUp, requestPasswordReset, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
