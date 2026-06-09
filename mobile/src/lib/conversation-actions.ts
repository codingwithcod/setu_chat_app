import type { QueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { CONVERSATIONS_KEY } from '@/hooks/useConversations';
import type { ConversationWithDetails, MessageWithSender } from '@/types';

type ConvList = ConversationWithDetails[];

function upsertConversation(
  queryClient: QueryClient,
  conv: ConversationWithDetails
) {
  queryClient.setQueryData<ConvList>(CONVERSATIONS_KEY, (prev) => {
    const list = prev ?? [];
    const without = list.filter((c) => c.id !== conv.id);
    return [conv, ...without].sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
    );
  });
}

/** Patch a single conversation already in the cache (in place, keep order). */
function patchConversation(
  queryClient: QueryClient,
  id: string,
  patch: Partial<ConversationWithDetails>
) {
  queryClient.setQueryData<ConvList>(CONVERSATIONS_KEY, (prev) =>
    prev?.map((c) => (c.id === id ? { ...c, ...patch } : c))
  );
}

function removeConversation(queryClient: QueryClient, id: string) {
  queryClient.setQueryData<ConvList>(CONVERSATIONS_KEY, (prev) =>
    prev?.filter((c) => c.id !== id)
  );
}

/**
 * Open (or create) a 1:1 conversation with another user. Mirrors the web's
 * Sidebar.handleSelectUser → POST /api/conversations. Returns the conversation
 * id to navigate to. Newly created conversations are seeded into the cache so
 * the Chats list shows them immediately.
 */
export async function startPrivateChat(
  otherUserId: string,
  queryClient: QueryClient
): Promise<string> {
  const conv = await api.post<ConversationWithDetails>('/api/conversations', {
    type: 'private',
    memberIds: [otherUserId],
  });
  upsertConversation(queryClient, conv);
  return conv.id;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  memberIds: string[];
}

/** Create a group conversation. Returns the new conversation id. */
export async function createGroup(
  input: CreateGroupInput,
  queryClient: QueryClient
): Promise<string> {
  const conv = await api.post<ConversationWithDetails>('/api/conversations', {
    type: 'group',
    name: input.name,
    description: input.description,
    memberIds: input.memberIds,
  });
  upsertConversation(queryClient, conv);
  return conv.id;
}

/** Fetch the full conversation (members + profiles) for the info/settings screen. */
export function fetchConversation(id: string) {
  return api.get<ConversationWithDetails>(`/api/conversations/${id}`);
}

// ── Group management (admin/owner gated server-side) ────────────────

export async function updateGroup(
  id: string,
  updates: { name?: string; description?: string; avatar_url?: string | null },
  queryClient: QueryClient
): Promise<ConversationWithDetails> {
  const conv = await api.patch<ConversationWithDetails>(
    `/api/conversations/${id}`,
    updates
  );
  // The PATCH response is the bare conversation row (no members); merge fields.
  patchConversation(queryClient, id, {
    name: conv.name,
    description: conv.description,
    avatar_url: conv.avatar_url,
  });
  return conv;
}

export async function addGroupMembers(
  id: string,
  memberIds: string[],
  queryClient: QueryClient
): Promise<ConversationWithDetails> {
  const conv = await api.post<ConversationWithDetails>(
    `/api/conversations/${id}/members`,
    { memberIds }
  );
  upsertConversation(queryClient, conv);
  return conv;
}

export async function removeGroupMember(
  id: string,
  userId: string,
  queryClient: QueryClient
): Promise<ConversationWithDetails> {
  const conv = await api.del<ConversationWithDetails>(
    `/api/conversations/${id}/members`,
    { userId }
  );
  upsertConversation(queryClient, conv);
  return conv;
}

export async function changeMemberRole(
  id: string,
  userId: string,
  newRole: 'admin' | 'member',
  queryClient: QueryClient
): Promise<ConversationWithDetails> {
  const conv = await api.patch<ConversationWithDetails>(
    `/api/conversations/${id}/members/role`,
    { userId, newRole }
  );
  upsertConversation(queryClient, conv);
  return conv;
}

/** Leave a group (delete my own membership). Removes it from the list. */
export async function leaveGroup(
  id: string,
  myId: string,
  queryClient: QueryClient
): Promise<void> {
  await api.del(`/api/conversations/${id}/members`, { userId: myId });
  removeConversation(queryClient, id);
}

/** Delete a group (owner only) — soft delete server-side. */
export async function deleteGroup(
  id: string,
  queryClient: QueryClient
): Promise<void> {
  await api.del(`/api/conversations/${id}`);
  removeConversation(queryClient, id);
}

export interface ForwardResult {
  data: MessageWithSender[];
  forwardedCount: number;
  message: string;
}

/**
 * Forward a message to any mix of existing conversations and users (each user
 * resolves/creates a private chat server-side). Mirrors the web ForwardMessageModal.
 */
export async function forwardMessage(
  messageId: string,
  targets: { conversationIds: string[]; userIds: string[] },
  queryClient: QueryClient
): Promise<ForwardResult> {
  const res = await api.post<MessageWithSender[]>('/api/messages/forward', {
    messageId,
    conversationIds: targets.conversationIds,
    userIds: targets.userIds,
  });
  // api.post unwraps `data`; the forward route's `data` is the messages array.
  // Refresh the list so any newly-created DMs and bumped previews appear.
  queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
  return {
    data: res ?? [],
    forwardedCount: res?.length ?? 0,
    message: `Message forwarded to ${res?.length ?? 0} conversation(s)`,
  };
}
