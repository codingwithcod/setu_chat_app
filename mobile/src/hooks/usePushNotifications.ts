import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/context/AuthContext';
import { registerForPush } from '@/lib/push';

/**
 * Registers the device for push once authenticated, and routes notification
 * taps to the right chat (both warm taps and cold-start launches). Mounted once
 * in the authenticated tabs layout.
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const router = useRouter();
  const handled = useRef<string | null>(null);

  // Register once we have a session.
  useEffect(() => {
    if (session) registerForPush();
  }, [session]);

  // Navigate to the chat a notification points at.
  useEffect(() => {
    const open = (data: unknown) => {
      const convId = (data as { conversationId?: string })?.conversationId;
      if (convId) router.push(`/chat/${convId}`);
    };

    // Cold start: app launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const id = response?.notification.request.identifier;
      if (response && id && handled.current !== id) {
        handled.current = id;
        open(response.notification.request.content.data);
      }
    });

    // Warm taps while the app is running/backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      open(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, [router]);
}
