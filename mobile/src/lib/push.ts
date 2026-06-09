import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';
import { useChatStore } from '@/stores/chat';

/**
 * Native push (Expo). Backend is ready: POST /api/push/subscribe
 * { platform:'expo', token } registers the device; POST /api/push/unsubscribe
 * { endpoint: token } removes it. Pushes carry data:{ conversationId } so a tap
 * opens the chat. Requires a real build — Expo Go can't receive remote push.
 */

let registeredToken: string | null = null;

/** How notifications behave while the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const convId = (notification.request.content.data as { conversationId?: string })
      ?.conversationId;
    // Don't interrupt with a banner for the chat you're already viewing.
    const inThisChat =
      !!convId && useChatStore.getState().activeConversationId === convId;
    return {
      shouldShowBanner: !inThisChat,
      shouldShowList: true,
      shouldPlaySound: !inThisChat,
      shouldSetBadge: false,
    };
  },
});

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig
      ?.projectId
  );
}

/**
 * Request permission, get the Expo push token, and register it with the backend.
 * Safe to call repeatedly (subscribe upserts on the token). No-op on simulators
 * or when permission is denied.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e84393',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return null;

  const projectId = getProjectId();
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    registeredToken = token;
    await api.post('/api/push/subscribe', { platform: 'expo', token });
    return token;
  } catch {
    return null;
  }
}

/** Remove this device's registration. Call BEFORE signing out (needs auth). */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await api.post('/api/push/unsubscribe', { endpoint: token });
  } catch {
    // best effort — the server also prunes dead tokens on send
  }
}
