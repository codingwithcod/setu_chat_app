/**
 * Chat domain types — the subset of the web app's src/types/index.ts that the
 * mobile client needs. Kept field-for-field identical so API payloads map
 * directly. Dev/API-key/webhook types are intentionally excluded.
 */

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  auth_providers: string[];
  is_email_verified: boolean;
  is_online: boolean;
  last_seen: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  totp_enabled: boolean;
  totp_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group' | 'self';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  is_deleted: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  pinned_at: string | null;
}

export interface MessageFile {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: 'image' | 'video' | 'audio' | 'file';
  mime_type: string | null;
  display_order: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'system';
  reply_to: string | null;
  forwarded_from: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface ReadReceipt {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

export interface PinnedMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
}

export interface MessageReceiptDetail {
  user_id: string;
  first_name: string;
  last_name: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface MessageWithSender extends Message {
  sender: Profile;
  reply_message?: Message & { sender: Profile };
  forwarded_message?: {
    id: string;
    content: string | null;
    message_type: string;
    sender_id: string;
    created_at: string;
    sender: Profile;
  };
  reactions?: MessageReaction[];
  files?: MessageFile[];
  status?: MessageStatus;
  receiptDetails?: MessageReceiptDetail[];
  /** Stable key for optimistic UI before the server id arrives. */
  _clientId?: string;
}

export interface OtherReadReceipt {
  user_id: string;
  last_read_at: string;
  last_read_message_id: string | null;
  delivered_at: string | null;
}

export interface ConversationWithDetails extends Conversation {
  members: (ConversationMember & { profile: Profile })[];
  last_message?: MessageWithSender;
  unread_count?: number;
}

export interface SearchResult {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  is_online: boolean;
}

export interface TypingUser {
  user_id: string;
  username: string;
  timestamp: number;
}

export interface UploadedFileData {
  url: string;
  name: string;
  size: number;
  file_type: 'image' | 'video' | 'audio' | 'file';
  mime_type: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_name: string;
  device_type:
    | 'desktop_app'
    | 'desktop_browser'
    | 'mobile_app'
    | 'mobile_browser'
    | 'tablet_browser';
  browser_name: string | null;
  os_name: string | null;
  ip_address: string | null;
  location: string | null;
  is_current?: boolean;
  last_active_at: string;
  created_at: string;
}
