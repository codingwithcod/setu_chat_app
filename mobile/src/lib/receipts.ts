import type {
  ConversationMember,
  MessageStatus,
  MessageWithSender,
  OtherReadReceipt,
  Profile,
} from '@/types';

type Member = ConversationMember & { profile: Profile };

/**
 * Tick state for one of MY sent messages, derived from the other members'
 * read receipts (matches the web logic):
 *   - read      → every other member's last_read_at >= message time
 *   - delivered → every other member has delivered_at (or read) >= message time
 *   - sent      → otherwise
 * Optimistic 'sending'/'failed' states are preserved as-is.
 */
export function computeStatus(
  message: MessageWithSender,
  receipts: OtherReadReceipt[],
  members: Member[],
  myId: string
): MessageStatus {
  if (message.status === 'sending' || message.status === 'failed') {
    return message.status;
  }

  const others = members.filter((m) => m.user_id !== myId);
  if (others.length === 0) return 'sent';

  const created = new Date(message.created_at).getTime();
  let allRead = true;
  let allDelivered = true;

  for (const o of others) {
    const r = receipts.find((x) => x.user_id === o.user_id);
    const readAt = r?.last_read_at ? new Date(r.last_read_at).getTime() : 0;
    const deliveredAt = r?.delivered_at ? new Date(r.delivered_at).getTime() : 0;
    if (readAt < created) allRead = false;
    if (deliveredAt < created && readAt < created) allDelivered = false;
  }

  if (allRead) return 'read';
  if (allDelivered) return 'delivered';
  return 'sent';
}
