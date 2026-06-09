import { create } from 'zustand';

/** In-memory activity feed, mirroring the web's useNotificationStore shape. */
export interface AppNotification {
  id: string;
  type: 'message' | 'group' | 'system';
  title: string;
  body: string;
  conversationId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
}

const MAX = 100;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, MAX),
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((state) => {
      const target = state.notifications.find((x) => x.id === id);
      if (!target || target.read) return state;
      return {
        notifications: state.notifications.map((x) =>
          x.id === id ? { ...x, read: true } : x
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((x) => ({ ...x, read: true })),
      unreadCount: 0,
    })),
  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
