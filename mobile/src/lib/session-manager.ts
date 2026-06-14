import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Session Manager for the mobile app.
 *
 * Manages a unique session token in AsyncStorage for multi-session tracking.
 * This is the mobile equivalent of the web's src/lib/session-manager.ts
 * (which uses localStorage).
 */

const SESSION_TOKEN_KEY = 'setu-session-token';
const SESSION_ID_KEY = 'setu-current-session-id';
const SESSION_USER_KEY = 'setu-current-session-user';

// ---------------------------------------------------------------------------
// In-memory cache so we can return synchronously after the first async read.
// Populated eagerly at module load and kept in sync on every write.
// ---------------------------------------------------------------------------
let cachedToken: string | null = null;
let cachedSessionId: string | null = null;
let cachedUserId: string | null = null;
let hydrated = false;

/** Eagerly read all keys into memory. Called once at app startup. */
export async function hydrateSessionManager(): Promise<void> {
  if (hydrated) return;
  const [[, t], [, s], [, u]] = await AsyncStorage.multiGet([
    SESSION_TOKEN_KEY,
    SESSION_ID_KEY,
    SESSION_USER_KEY,
  ]);
  cachedToken = t ?? null;
  cachedSessionId = s ?? null;
  cachedUserId = u ?? null;
  hydrated = true;
}

// Fire-and-forget at module load so the cache is warm by the time hooks run.
void hydrateSessionManager();

/** Generate a UUID v4 using crypto.getRandomValues (polyfilled by react-native-get-random-values). */
function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Get the current session token, or create a new one if none exists.
 * Returns synchronously from the in-memory cache after first hydration.
 */
export async function getOrCreateSessionToken(): Promise<string> {
  await hydrateSessionManager();
  if (cachedToken) return cachedToken;

  const token = uuidv4();
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
  cachedToken = token;
  return token;
}

/** Get the current session token (returns null if not set). */
export function getSessionToken(): string | null {
  return cachedToken;
}

/** Clear the session token and related keys. Call this on sign out. */
export async function clearSessionToken(): Promise<void> {
  cachedToken = null;
  cachedSessionId = null;
  cachedUserId = null;
  await AsyncStorage.multiRemove([
    SESSION_TOKEN_KEY,
    SESSION_ID_KEY,
    SESSION_USER_KEY,
  ]);
}

/** Store the current session's database row ID. */
export async function setCurrentSessionId(id: string): Promise<void> {
  cachedSessionId = id;
  await AsyncStorage.setItem(SESSION_ID_KEY, id);
}

/** Get the current session's database row ID. */
export function getCurrentSessionId(): string | null {
  return cachedSessionId;
}

/** Store which user the tracked session belongs to. */
export async function setCurrentSessionUserId(userId: string): Promise<void> {
  cachedUserId = userId;
  await AsyncStorage.setItem(SESSION_USER_KEY, userId);
}

/** Get the user ID the tracked session belongs to. */
export function getCurrentSessionUserId(): string | null {
  return cachedUserId;
}
