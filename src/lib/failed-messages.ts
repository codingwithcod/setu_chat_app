import type { MessageWithSender } from "@/types";

const STORAGE_KEY = "setu_failed_messages";

/**
 * Get all failed messages from localStorage, keyed by conversationId.
 */
function getAllFailedMessages(): Record<string, MessageWithSender[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save the full map back to localStorage.
 */
function saveAllFailedMessages(map: Record<string, MessageWithSender[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/**
 * Get failed messages for a specific conversation.
 */
export function getFailedMessages(conversationId: string): MessageWithSender[] {
  const map = getAllFailedMessages();
  return map[conversationId] || [];
}

/**
 * Add a failed message to localStorage for the given conversation.
 * Prevents duplicates by tempId.
 */
export function addFailedMessage(
  conversationId: string,
  message: MessageWithSender
) {
  const map = getAllFailedMessages();
  const existing = map[conversationId] || [];

  // Don't duplicate
  if (existing.some((m) => m.id === message.id)) return;

  map[conversationId] = [...existing, { ...message, status: "failed" }];
  saveAllFailedMessages(map);
}

/**
 * Remove a failed message from localStorage (e.g. after successful retry).
 */
export function removeFailedMessage(
  conversationId: string,
  messageId: string
) {
  const map = getAllFailedMessages();
  const existing = map[conversationId] || [];
  map[conversationId] = existing.filter((m) => m.id !== messageId);

  // Clean up empty arrays
  if (map[conversationId].length === 0) {
    delete map[conversationId];
  }

  saveAllFailedMessages(map);
}

/**
 * Clear all failed messages for a conversation.
 */
export function clearFailedMessages(conversationId: string) {
  const map = getAllFailedMessages();
  delete map[conversationId];
  saveAllFailedMessages(map);
}
