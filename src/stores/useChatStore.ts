import { create } from "zustand";
import type {
  ConversationWithDetails,
  MessageWithSender,
  TypingUser,
  SearchResult,
} from "@/types";

// Helper to sort conversations by last_message_at descending
const sortByLatest = (conversations: ConversationWithDetails[]) =>
  [...conversations].sort(
    (a, b) =>
      new Date(b.last_message_at || b.created_at).getTime() -
      new Date(a.last_message_at || a.created_at).getTime()
  );

interface ChatState {
  conversations: ConversationWithDetails[];
  conversationsLoaded: boolean;
  activeConversation: ConversationWithDetails | null;
  messages: MessageWithSender[];
  typingUsers: TypingUser[];
  replyingTo: MessageWithSender | null;
  forwardingMessage: MessageWithSender | null;
  isSidebarOpen: boolean;
  suggestedUsers: SearchResult[];
  suggestedUsersLoaded: boolean;

  setConversations: (conversations: ConversationWithDetails[]) => void;
  addConversation: (conversation: ConversationWithDetails) => void;
  updateConversation: (
    id: string,
    updates: Partial<ConversationWithDetails>
  ) => void;
  removeConversation: (id: string) => void;
  setActiveConversation: (conversation: ConversationWithDetails | null) => void;
  setMessages: (messages: MessageWithSender[]) => void;
  addMessage: (message: MessageWithSender) => void;
  updateMessage: (id: string, updates: Partial<MessageWithSender>) => void;
  removeMessage: (id: string) => void;
  prependMessages: (messages: MessageWithSender[]) => void;
  setTypingUsers: (users: TypingUser[]) => void;
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (userId: string) => void;
  setReplyingTo: (message: MessageWithSender | null) => void;
  setForwardingMessage: (message: MessageWithSender | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  incrementUnreadCount: (conversationId: string) => void;
  resetUnreadCount: (conversationId: string) => void;
  setSuggestedUsers: (users: SearchResult[]) => void;
  removeSuggestedUser: (userId: string) => void;
  setMemberPresence: (
    userId: string,
    presence: { is_online: boolean; last_seen: string }
  ) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  conversationsLoaded: false,
  activeConversation: null,
  messages: [],
  typingUsers: [],
  replyingTo: null,
  forwardingMessage: null,
  isSidebarOpen: true,
  suggestedUsers: [],
  suggestedUsersLoaded: false,

  setConversations: (conversations) =>
    set({ conversations: sortByLatest(conversations), conversationsLoaded: true }),
  addConversation: (conversation) =>
    set((state) => ({
      conversations: sortByLatest([conversation, ...state.conversations]),
    })),
  updateConversation: (id, updates) =>
    set((state) => {
      const updatedConversations = state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      return {
        conversations: sortByLatest(updatedConversations),
        activeConversation:
          state.activeConversation?.id === id
            ? { ...state.activeConversation, ...updates }
            : state.activeConversation,
      };
    }),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversation:
        state.activeConversation?.id === id ? null : state.activeConversation,
    })),
  setActiveConversation: (conversation) =>
    set({ activeConversation: conversation }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
  prependMessages: (messages) =>
    set((state) => ({
      messages: [...messages, ...state.messages],
    })),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
  addTypingUser: (user) =>
    set((state) => ({
      typingUsers: [
        ...state.typingUsers.filter((u) => u.user_id !== user.user_id),
        user,
      ],
    })),
  removeTypingUser: (userId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter((u) => u.user_id !== userId),
    })),
  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setForwardingMessage: (forwardingMessage) => set({ forwardingMessage }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  incrementUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: sortByLatest(
        state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, unread_count: (c.unread_count || 0) + 1 }
            : c
        )
      ),
    })),
  resetUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    })),
  setSuggestedUsers: (suggestedUsers) =>
    set({ suggestedUsers, suggestedUsersLoaded: true }),
  removeSuggestedUser: (userId) =>
    set((state) => ({
      suggestedUsers: state.suggestedUsers.filter((u) => u.id !== userId),
    })),
  // Patch a single user's live presence (is_online / last_seen) wherever their
  // profile is cached — every conversation member, the active conversation, and
  // the suggested-users list. Driven by realtime profiles UPDATE events so a
  // peer coming online/offline reflects without a refetch. Does NOT re-sort
  // conversations (presence doesn't affect ordering).
  setMemberPresence: (userId, presence) =>
    set((state) => {
      const patchConv = (conv: ConversationWithDetails) => {
        if (!conv.members?.some((m) => m.user_id === userId)) return conv;
        return {
          ...conv,
          members: conv.members.map((m) =>
            m.user_id === userId && m.profile
              ? { ...m, profile: { ...m.profile, ...presence } }
              : m
          ),
        };
      };
      return {
        conversations: state.conversations.map(patchConv),
        activeConversation: state.activeConversation
          ? patchConv(state.activeConversation)
          : null,
        suggestedUsers: state.suggestedUsers.map((u) =>
          u.id === userId ? { ...u, ...presence } : u
        ),
      };
    }),
}));
