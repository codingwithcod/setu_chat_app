"use client";

import { useNotificationStore } from "@/stores/useNotificationStore";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Bell,
  MessageSquare,
  Users,
  CheckCheck,
  X,
} from "lucide-react";

export function NotificationPanel() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 z-50 w-80 bg-popover border rounded-xl shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="h-5 min-w-[20px] rounded-full text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Read all
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => {
                markAsRead(notification.id);
                if (notification.conversationId) {
                  router.push(`/chat/${notification.conversationId}`);
                }
                setIsOpen(false);
              }}
              className={`w-full flex items-start gap-3 p-3 hover:bg-accent transition-colors text-left ${
                !notification.read ? "bg-primary/5" : ""
              }`}
            >
              <div className="rounded-full bg-muted p-2 shrink-0">
                {notification.type === "message" ? (
                  <MessageSquare className="h-4 w-4 text-primary" />
                ) : notification.type === "group" ? (
                  <Users className="h-4 w-4 text-primary" />
                ) : (
                  <Bell className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {notification.body}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
              )}
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
