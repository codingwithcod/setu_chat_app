"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { MessageListSkeleton } from "@/components/shared/LoadingSkeleton";
import type { MessageWithSender, ConversationWithDetails } from "@/types";
import { Loader2, ChevronDown } from "lucide-react";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { user } = useAuthStore();
  const {
    messages,
    setMessages,
    addMessage,
    prependMessages,
    activeConversation,
    setActiveConversation,
    replyingTo,
    resetUnreadCount,
  } = useChatStore();

  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // For scrolling to unread divider
  const hasScrolledToUnread = useRef(false);
  const unreadDividerRef = useRef<HTMLDivElement>(null);

  // Realtime hooks
  useRealtimeMessages(conversationId);
  const { typingUsers, sendTyping } = useTypingIndicator(conversationId);

  // Reset unread count in sidebar when entering a conversation
  useEffect(() => {
    resetUnreadCount(conversationId);
    hasScrolledToUnread.current = false;
    setUnreadCount(0);
  }, [conversationId, resetUnreadCount]);

  // Load conversation details
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`);
        const data = await res.json();
        if (data.data) {
          setActiveConversation(data.data as ConversationWithDetails);
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
        router.push("/chat");
      }
    };

    loadConversation();
  }, [conversationId, setActiveConversation, router]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/messages?limit=50`
        );
        const data = await res.json();
        if (data.data) {
          setMessages(data.data as MessageWithSender[]);
          setHasMore(data.hasMore);
          setCursor(data.nextCursor);
          // API returns the unread count (calculated BEFORE marking read)
          if (data.unreadCount > 0) {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
      setIsLoading(false);
    };

    loadMessages();

    return () => {
      setMessages([]);
      setActiveConversation(null);
    };
  }, [conversationId, setMessages, setActiveConversation]);

  // Smart scroll: scroll to unread divider or bottom after messages load
  useEffect(() => {
    if (isLoading || messages.length === 0 || hasScrolledToUnread.current)
      return;

    hasScrolledToUnread.current = true;

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (unreadCount > 0 && unreadDividerRef.current && containerRef.current) {
        const container = containerRef.current;
        const divider = unreadDividerRef.current;
        const containerHeight = container.clientHeight;
        const dividerOffset = divider.offsetTop;

        // Position the divider in the upper-middle portion of the viewport
        const scrollTarget = dividerOffset - containerHeight * 0.35;
        container.scrollTop = Math.max(0, scrollTarget);
      } else if (containerRef.current) {
        // No unread messages — scroll to bottom
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }, [isLoading, messages.length, unreadCount]);

  // Load more messages
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?limit=50&cursor=${cursor}`
      );
      const data = await res.json();
      if (data.data) {
        prependMessages(data.data as MessageWithSender[]);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, cursor, conversationId, prependMessages]);

  const { containerRef, scrollToBottom } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loadingMore,
    direction: "up",
  });

  // Scroll to bottom on new message from self
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_id === user?.id) {
        scrollToBottom();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, user?.id, scrollToBottom]);

  // Send message
  const handleSendMessage = async (
    content: string,
    messageType: string = "text",
    fileData?: { url: string; name: string; size: number }
  ) => {
    if (!user) return;

    // Clear the unread divider once user sends a message
    setUnreadCount(0);

    // Optimistic update
    const optimisticMessage: MessageWithSender = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType as "text" | "image" | "file",
      file_url: fileData?.url || null,
      file_name: fileData?.name || null,
      file_size: fileData?.size || null,
      reply_to: replyingTo?.id || null,
      forwarded_from: null,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: user,
      reply_message: replyingTo || undefined,
    };

    addMessage(optimisticMessage);
    scrollToBottom();

    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          message_type: messageType,
          file_url: fileData?.url,
          file_name: fileData?.name,
          file_size: fileData?.size,
          reply_to: replyingTo?.id,
        }),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Calculate where to place the unread divider
  const unreadDividerIndex =
    unreadCount > 0 && messages.length > 0
      ? messages.length - unreadCount
      : -1;

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2
          className="h-8 w-8 text-primary"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader conversation={activeConversation} />

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2
              className="h-5 w-5 text-primary"
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        )}

        {isLoading ? (
          <MessageListSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                No messages yet. Start the conversation! 👋
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => (
              <div key={message.id}>
                {/* Unread messages divider */}
                {index === unreadDividerIndex && unreadDividerIndex > 0 && (
                  <div
                    ref={unreadDividerRef}
                    className="flex items-center gap-3 my-4 px-2"
                  >
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-primary/60" />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <ChevronDown className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium text-primary whitespace-nowrap">
                        {unreadCount} unread message{unreadCount > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-primary/60 to-primary/60" />
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={message.sender_id === user?.id}
                  showAvatar={
                    index === 0 ||
                    messages[index - 1]?.sender_id !== message.sender_id
                  }
                />
              </div>
            ))}
          </div>
        )}

        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
      </div>

      <MessageInput
        onSend={handleSendMessage}
        onTyping={sendTyping}
        conversationId={conversationId}
      />
    </div>
  );
}
