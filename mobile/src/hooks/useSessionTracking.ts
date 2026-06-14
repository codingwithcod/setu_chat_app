import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useRealtimeSessions } from '@/hooks/useRealtimeSessions';
import { api } from '@/lib/api';
import { getDeviceInfo } from '@/lib/device-info';
import {
  clearSessionToken,
  getOrCreateSessionToken,
  getCurrentSessionId,
  getCurrentSessionUserId,
  setCurrentSessionId,
  setCurrentSessionUserId,
} from '@/lib/session-manager';
import type { UserSession } from '@/types';

/**
 * Tracks the mobile session in the server's `user_sessions` table after
 * authentication, and subscribes to realtime session changes.
 *
 * Should be rendered once inside the root navigator (after AuthProvider).
 * This is the mobile equivalent of the session-tracking block in the web's
 * (main)/layout.tsx.
 */
export function useSessionTracking() {
  const { isAuthenticated, session, signOut } = useAuth();
  const userId = session?.user?.id;
  const tracked = useRef(false);

  // -----------------------------------------------------------------------
  // Track session on login
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !userId || tracked.current) return;
    tracked.current = true;

    void (async () => {
      try {
        const deviceInfo = getDeviceInfo();

        // If the stored session belongs to a DIFFERENT account (account switch),
        // start a clean session instead of mistaking it for a revocation.
        const previousSessionUserId = getCurrentSessionUserId();
        if (previousSessionUserId && previousSessionUserId !== userId) {
          await clearSessionToken();
        }

        const sessionToken = await getOrCreateSessionToken();
        const previousSessionId = getCurrentSessionId();

        const trackResult = await api.post<{
          data: UserSession;
          new_device_detected: boolean;
        }>('/api/sessions/track', {
          sessionToken,
          deviceName: deviceInfo.deviceName,
          deviceType: deviceInfo.deviceType,
          browserName: deviceInfo.browserName,
          osName: deviceInfo.osName,
        });

        // The api helper auto-unwraps { data } so trackResult IS the
        // inner payload. Handle both wrapped and unwrapped shapes.
        const result = trackResult as unknown as
          | { data: UserSession; new_device_detected: boolean }
          | UserSession;

        const sessionData = 'data' in result ? result.data : result;
        const newDeviceDetected = 'new_device_detected' in result
          ? result.new_device_detected
          : false;

        if (sessionData?.id) {
          // If we had a stored session FOR THIS USER that no longer exists
          // (was revoked), and the server created a brand new one → revoked.
          if (
            previousSessionId &&
            previousSessionUserId === userId &&
            newDeviceDetected
          ) {
            await clearSessionToken();
            await signOut();
            return;
          }
          await setCurrentSessionId(sessionData.id);
          await setCurrentSessionUserId(userId);
        }
      } catch (err) {
        // Session tracking is best-effort — never block the user.
        console.warn('[SessionTracking] Failed to track session:', err);
      }
    })();
  }, [isAuthenticated, userId, signOut]);

  // Reset tracking flag on sign-out so the next login re-tracks.
  useEffect(() => {
    if (!isAuthenticated) {
      tracked.current = false;
    }
  }, [isAuthenticated]);

  // -----------------------------------------------------------------------
  // Realtime session listener
  // -----------------------------------------------------------------------
  const handleSessionRevoked = useCallback(async () => {
    await clearSessionToken();
    Alert.alert(
      'Session ended',
      'Your session was signed out from another device.',
      [{ text: 'OK' }]
    );
    await signOut();
  }, [signOut]);

  const handleNewLogin = useCallback((newSession: UserSession) => {
    // Informational — let the user know another device signed in.
    Alert.alert(
      'New login detected',
      `A new sign-in was detected on ${newSession.device_name || 'another device'}.${newSession.location ? `\nLocation: ${newSession.location}` : ''}`,
      [{ text: 'OK' }]
    );
  }, []);

  useRealtimeSessions({
    onNewLogin: handleNewLogin,
    onSessionRevoked: handleSessionRevoked,
  });
}
