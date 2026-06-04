"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime } from "@/lib/utils";
import {
  Search,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  Info,
  MessageSquare,
  UsersRound,
  User,
} from "lucide-react";

interface AdminMessage {
  id: string;
  content: string | null;
  message_type: "text" | "image" | "file" | "system";
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  conversation: {
    id: string;
    type: "private" | "group" | "self";
    name: string | null;
  } | null;
}

const TYPE_FILTERS = [
  { key: "", label: "All" },
  { key: "text", label: "Text" },
  { key: "image", label: "Images" },
  { key: "file", label: "Files" },
];

const STATUS_FILTERS = [
  { key: "", label: "Any" },
  { key: "edited", label: "Edited" },
  { key: "deleted", label: "Deleted" },
];

function TypeIcon({ type }: { type: AdminMessage["message_type"] }) {
  if (type === "image") return <ImageIcon className="h-3.5 w-3.5" />;
  if (type === "file") return <FileText className="h-3.5 w-3.5" />;
  if (type === "system") return <Info className="h-3.5 w-3.5" />;
  return <MessageSquare className="h-3.5 w-3.5" />;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/messages?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [page, q, type, status]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const remove = async (id: string) => {
    if (!confirm("Delete this message? It will be removed from the chat.")) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Delete failed");
    }
    setBusyId(null);
    load();
  };

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Moderation feed · {total} message{total === 1 ? "" : "s"}.
        </p>
      </header>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search message content…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={type === f.key ? "default" : "outline"}
              onClick={() => {
                setPage(1);
                setType(f.key);
              }}
            >
              {f.label}
            </Button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={status === f.key ? "default" : "outline"}
              onClick={() => {
                setPage(1);
                setStatus(f.key);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center rounded-xl border border-border bg-card py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
            No messages found.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={m.sender?.avatar_url || ""} alt={m.sender?.full_name} />
                <AvatarFallback className="text-xs">
                  {(m.sender?.full_name || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium">
                    {m.sender?.full_name?.trim() ||
                      (m.sender?.username ? `@${m.sender.username}` : "Unknown")}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {m.conversation?.type === "group" ? (
                      <UsersRound className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    {m.conversation?.type === "group"
                      ? m.conversation?.name || "Group"
                      : "Private chat"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(m.created_at)} · {formatTime(m.created_at)}
                  </span>
                  {m.message_type !== "text" && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <TypeIcon type={m.message_type} />
                      {m.message_type}
                    </Badge>
                  )}
                  {m.is_edited && (
                    <Badge variant="secondary" className="text-[10px]">
                      edited
                    </Badge>
                  )}
                  {m.is_deleted && (
                    <Badge variant="destructive" className="text-[10px]">
                      deleted
                    </Badge>
                  )}
                </div>
                <p
                  className={`mt-1 whitespace-pre-wrap break-words text-sm ${
                    m.is_deleted ? "italic text-muted-foreground" : ""
                  }`}
                >
                  {m.is_deleted
                    ? "(message deleted)"
                    : m.content || (
                        <span className="italic text-muted-foreground">
                          (no text — {m.message_type})
                        </span>
                      )}
                </p>
              </div>

              {!m.is_deleted && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={busyId === m.id}
                  onClick={() => remove(m.id)}
                  title="Delete message"
                >
                  {busyId === m.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
