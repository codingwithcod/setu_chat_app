"use client";

import type { MessageStatus as Status } from "@/types";

interface MessageStatusProps {
  status: Status;
  isEmojiOnly?: boolean;
}

const SIZE = 12;

export function MessageStatus({ status, isEmojiOnly }: MessageStatusProps) {
  const baseClass = isEmojiOnly
    ? "text-muted-foreground"
    : "opacity-60";

  switch (status) {
    case "sending":
      return (
        <span className={`inline-flex items-center ${baseClass}`} title="Sending...">
          <svg className="animate-spin" width={SIZE} height={SIZE} viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"
              strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
          </svg>
        </span>
      );

    case "sent":
      return (
        <span className={`inline-flex items-center ${baseClass}`} title="Sent">
          <svg width={SIZE} height={SIZE} viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
      );

    case "delivered":
      return (
        <span className={`inline-flex items-center ${baseClass}`} title="Delivered">
          <svg width={SIZE} height={SIZE} viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      );

    case "read":
      return (
        <span className={`inline-flex items-center ${baseClass}`} title="Seen">
          <svg width={SIZE} height={SIZE} viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
            <circle cx="8" cy="8" r="3.5" fill="currentColor" />
          </svg>
        </span>
      );

    case "failed":
      return (
        <span className="inline-flex items-center text-rose-400 hover:text-rose-300 transition-colors" title="Failed to send — click to retry">
          <svg width={SIZE + 2} height={SIZE + 2} viewBox="0 0 16 16" fill="none" className="animate-pulse">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.9" fill="currentColor" />
          </svg>
        </span>
      );

    default:
      return null;
  }
}
