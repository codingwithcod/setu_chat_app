/**
 * Session Manager Utility
 * Manages the session token in localStorage for multi-session tracking.
 */

import { v4 as uuidv4 } from "uuid";

const SESSION_TOKEN_KEY = "setu-session-token";
const SESSION_ID_KEY = "setu-current-session-id";

/**
 * Get the current session token from localStorage, or create a new one.
 */
export function getOrCreateSessionToken(): string {
  if (typeof window === "undefined") return "";

  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = uuidv4();
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Get the current session token (returns null if not set).
 */
export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Clear the session token and session ID from localStorage.
 * Call this on sign out.
 */
export function clearSessionToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
}

/**
 * Store the current session's database ID for reference.
 */
export function setCurrentSessionId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_ID_KEY, id);
}

/**
 * Get the current session's database ID.
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_ID_KEY);
}
