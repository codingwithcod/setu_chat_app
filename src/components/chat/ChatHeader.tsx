"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileImageViewer } from "@/components/shared/ProfileImageViewer";
import { Button } from "@/components/ui/button";
import { OnlineIndicator } from "@/components/shared/OnlineIndicator";
import { getInitials, formatDate } from "@/lib/utils";
import { isUserOnline } from "@/lib/presence";
import { useNow } from "@/hooks/useNow";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Users,
  Pin,
  PinOff,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConversationWithDetails } from "@/types";

export type ChatHeaderTab = "chat" | "files" | "photos";

const HEADER_TABS: { key: ChatHeaderTab; label: string }[] = [
  { key: "chat", label: "Chat" },
  { key: "files", label: "Files" },
  { key: "photos", label: "Photos" },
];

interface ChatHeaderProps {
  conversation: ConversationWithDetails;
  activeTab: ChatHeaderTab;
  onTabChange: (tab: ChatHeaderTab) => void;
}

export function ChatHeader({
  conversation,
  activeTab,
  onTabChange,
}: ChatHeaderProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setSidebarOpen, updateConversation } = useChatStore();
  const now = useNow();
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const mobileTabRef = useRef<HTMLDivElement>(null);

  // Close mobile tab dropdown on outside click
  useEffect(() => {
    if (!mobileTabOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileTabRef.current && !mobileTabRef.current.contains(e.target as Node)) {
        setMobileTabOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileTabOpen]);

  // Check if this conversation is pinned by the current user
  const currentMembership = conversation.members?.find(
    (m) => m.user_id === user?.id
  );
  const isPinned = !!currentMembership?.pinned_at;

  const handleTogglePin = async () => {
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/pin`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (res.ok && data.data) {
        // Update the local conversation member's pinned_at
        const updatedMembers = conversation.members?.map((m) =>
          m.user_id === user?.id
            ? { ...m, pinned_at: data.data.pinned_at }
            : m
        );
        updateConversation(conversation.id, { members: updatedMembers });
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const isGroup = conversation.type === "group";
  const isSelf = conversation.type === "self";
  const otherMember = !isGroup && !isSelf
    ? conversation.members?.find((m) => m.user_id !== user?.id)
    : null;
  const otherProfile = otherMember?.profile;

  const name = isSelf
    ? "Saved Messages"
    : isGroup
    ? conversation.name || "Group Chat"
    : otherProfile
    ? `${otherProfile.first_name} ${otherProfile.last_name}`
    : "Unknown User";

  const avatar = isSelf ? (user?.avatar_url || null) : isGroup ? conversation.avatar_url : otherProfile?.avatar_url;
  const isOnline = isSelf ? false : isUserOnline(otherProfile, now);
  const initials = isSelf
    ? (user ? getInitials(user.first_name, user.last_name) : "SM")
    : isGroup
    ? (conversation.name || "GC").substring(0, 2).toUpperCase()
    : otherProfile
    ? getInitials(otherProfile.first_name, otherProfile.last_name)
    : "??";

  const subtitle = isSelf
    ? "Your personal space"
    : isGroup
    ? `${conversation.members?.length || 0} members`
    : isOnline
    ? "Online"
    : otherProfile?.last_seen
    ? `Last seen ${formatDate(otherProfile.last_seen)}`
    : "Offline";

  const handleBack = () => {
    setSidebarOpen(true);
    router.push("/chat");
  };

  return (
    <div className="relative z-50 flex items-center justify-between border-b border-border px-4 py-3 glass-strong">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-full"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div
          className={`relative ${avatar ? "cursor-pointer" : ""}`}
          onClick={avatar ? () => setShowAvatarPreview(true) : undefined}
          role={avatar ? "button" : undefined}
          aria-label={avatar ? `View ${name}'s profile picture` : undefined}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar || ""} alt={name} />
            <AvatarFallback>
              {isGroup ? <Users className="h-5 w-5" /> : initials}
            </AvatarFallback>
          </Avatar>
          {!isGroup && !isSelf && (
            <OnlineIndicator
              isOnline={isOnline}
              size="sm"
              className="absolute -bottom-0.5 -right-0.5"
            />
          )}
        </div>

        <div>
          <h3
            className={`font-semibold text-sm ${
              otherMember ? "cursor-pointer hover:underline" : ""
            }`}
            onClick={
              otherMember
                ? () => router.push(`/user/${otherMember.user_id}`)
                : undefined
            }
          >
            {name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {!isGroup && isOnline && (
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
            )}
            {subtitle}
          </p>
        </div>

        {/* Mobile/Tablet: Teams-style dropdown — visible below lg */}
        <div className="lg:hidden relative mt-3" ref={mobileTabRef}>
          <button
            onClick={() => setMobileTabOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-primary rounded-md hover:bg-accent/50 transition-colors"
            aria-expanded={mobileTabOpen}
            aria-haspopup="listbox"
          >
            {HEADER_TABS.find((t) => t.key === activeTab)?.label}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                mobileTabOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {mobileTabOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMobileTabOpen(false)}
              />
              {/* Dropdown */}
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[150px] rounded-lg border border-border bg-popover p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
                {HEADER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      onTabChange(tab.key);
                      setMobileTabOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 my-0.5 text-sm transition-colors ${
                      activeTab === tab.key
                        ? "text-primary font-medium bg-accent/40"
                        : "text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <span className="w-4 flex items-center justify-center shrink-0">
                      {activeTab === tab.key && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop: inline tabs — visible on lg+ */}
      <div className="hidden lg:flex flex-1 items-end self-stretch -my-3 ml-4 mr-2 min-w-0">
        {HEADER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center px-3 pb-2 pt-4 text-xs font-medium border-b-2 transition-colors shrink-0 ${
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex">
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Coming Soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex">
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Coming Soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isGroup ? (
              <DropdownMenuItem
                onClick={() => router.push(`/chat/${conversation.id}/settings`)}
              >
                <Users className="mr-2 h-4 w-4" />
                Group Info
              </DropdownMenuItem>
            ) : !isSelf ? (
              <DropdownMenuItem
                onClick={() => {
                  if (otherMember?.user_id) {
                    router.push(`/user/${otherMember.user_id}`);
                  }
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={handleTogglePin}>
              {isPinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  Unpin Chat
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  Pin Chat
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Fullscreen profile picture viewer */}
      {showAvatarPreview && avatar && (
        <ProfileImageViewer
          url={avatar}
          name={name}
          onClose={() => setShowAvatarPreview(false)}
        />
      )}
    </div>
  );
}
