import type { ConversationWithDetails, MessageWithSender, Profile } from '@/types';
import { isUserOnline } from './presence';

/** The "other" participant in a 1:1 conversation (not the current user). */
export function otherMember(conv: ConversationWithDetails, myId: string) {
  return conv.members?.find((m) => m.user_id !== myId);
}

function fullName(p?: { first_name?: string; last_name?: string } | null): string {
  if (!p) return 'Unknown';
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
}

export interface ConversationDisplay {
  title: string;
  avatarUri: string | null;
  online: boolean;
  isGroup: boolean;
  isSelf: boolean;
}

/** Resolve the title / avatar / online dot for a conversation row. */
export function conversationDisplay(
  conv: ConversationWithDetails,
  myId: string
): ConversationDisplay {
  if (conv.type === 'self') {
    return { title: 'Saved Messages', avatarUri: null, online: false, isGroup: false, isSelf: true };
  }
  if (conv.type === 'group') {
    return {
      title: conv.name || 'Group',
      avatarUri: conv.avatar_url,
      online: false,
      isGroup: true,
      isSelf: false,
    };
  }
  // private
  const other = otherMember(conv, myId);
  return {
    title: fullName(other?.profile),
    avatarUri: other?.profile?.avatar_url ?? null,
    online: isUserOnline(other?.profile as Profile | undefined),
    isGroup: false,
    isSelf: false,
  };
}

/** One-line preview text for the last message in a conversation. */
export function lastMessagePreview(
  conv: ConversationWithDetails,
  myId: string
): string {
  const m = conv.last_message;
  if (!m) return 'No messages yet';
  if (m.is_deleted) return 'This message was deleted';

  const body = messageSnippet(m);

  // Prefix sender in groups (and "You:" everywhere it helps).
  if (m.sender_id === myId) return `You: ${body}`;
  if (conv.type === 'group') {
    const name = m.sender?.first_name || 'Someone';
    return `${name}: ${body}`;
  }
  return body;
}

function messageSnippet(m: MessageWithSender): string {
  switch (m.message_type) {
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'audio':
      return '🎙️ Voice message';
    case 'file':
      return '📎 Attachment';
    default:
      return m.content?.trim() || '';
  }
}
