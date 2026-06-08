import { create } from 'zustand';

interface ChatState {
  /** Conversation currently open on screen, or null. Used by the list realtime
   * handler to decide whether an incoming message should bump unread. */
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),
}));
