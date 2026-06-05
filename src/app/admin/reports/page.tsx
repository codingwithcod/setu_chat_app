"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/utils";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Flag,
  UsersRound,
  User,
} from "lucide-react";

interface Report {
  id: string;
  reason: "spam" | "harassment" | "hate" | "violence" | "sexual" | "other";
  details: string | null;
  status: "pending" | "dismissed" | "actioned";
  created_at: string;
  reviewed_at: string | null;
  reporter: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  reviewer: { full_name: string; username: string | null } | null;
  message: {
    id: string;
    content: string | null;
    message_type: "text" | "image" | "file" | "system";
    is_deleted: boolean;
    created_at: string;
    sender: {
      id: string;
      full_name: string;
      username: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
  conversation: {
    id: string;
    type: "private" | "group" | "self";
    name: string | null;
  } | null;
}

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "actioned", label: "Actioned" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

const REASON_LABELS: Record<Report["reason"], string> = {
  spam: "Spam / scam",
  harassment: "Harassment",
  hate: "Hate speech",
  violence: "Violence / threats",
  sexual: "Sexual content",
  other: "Other",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status });
    const res = await fetch(`/api/admin/reports?${params}`);
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "dismiss" | "delete_message") => {
    if (
      action === "delete_message" &&
      !confirm("Delete the reported message? It will be removed from the chat.")
    )
      return;
    setBusyId(id);
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Action failed");
    }
    setBusyId(null);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Member-reported messages. Admins only see content that was reported —
          never private chats at large.
        </p>
      </header>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={status === t.key ? "default" : "outline"}
            onClick={() => {
              setPage(1);
              setStatus(t.key);
            }}
          >
            {t.label}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {total} report{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Queue */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center rounded-xl border border-border bg-card py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
            <Flag className="mx-auto mb-3 h-8 w-8 opacity-40" />
            No {status === "all" ? "" : status} reports.
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              {/* Top row: reason + status + when */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="destructive" className="gap-1">
                  <Flag className="h-3 w-3" />
                  {REASON_LABELS[r.reason]}
                </Badge>
                {r.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                {r.status === "actioned" && (
                  <Badge className="bg-red-500/15 text-red-600">Message deleted</Badge>
                )}
                {r.status === "dismissed" && (
                  <Badge variant="outline">Dismissed</Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {r.conversation?.type === "group" ? (
                    <UsersRound className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {r.conversation?.type === "group"
                    ? r.conversation?.name || "Group"
                    : "Private chat"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(r.created_at)} · {formatTime(r.created_at)}
                </span>
              </div>

              {/* Reported message */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={r.message?.sender?.avatar_url || ""}
                      alt={r.message?.sender?.full_name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {(r.message?.sender?.full_name || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">
                    {r.message?.sender?.full_name?.trim() ||
                      (r.message?.sender?.username
                        ? `@${r.message.sender.username}`
                        : "Unknown sender")}
                  </span>
                  {r.message?.message_type !== "text" && (
                    <Badge variant="outline" className="text-[10px]">
                      {r.message?.message_type}
                    </Badge>
                  )}
                </div>
                <p
                  className={`whitespace-pre-wrap break-words text-sm ${
                    r.message?.is_deleted ? "italic text-muted-foreground" : ""
                  }`}
                >
                  {r.message?.is_deleted
                    ? "(message deleted)"
                    : r.message?.content || (
                        <span className="italic text-muted-foreground">
                          (no text — {r.message?.message_type})
                        </span>
                      )}
                </p>
              </div>

              {/* Reporter note */}
              <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <span>
                  Reported by{" "}
                  <span className="font-medium text-foreground">
                    {r.reporter?.full_name?.trim() ||
                      (r.reporter?.username ? `@${r.reporter.username}` : "a member")}
                  </span>
                </span>
              </div>
              {r.details && (
                <p className="mt-1 rounded-md bg-accent/40 px-2 py-1.5 text-xs italic">
                  “{r.details}”
                </p>
              )}

              {/* Actions */}
              {r.status === "pending" ? (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, "dismiss")}
                  >
                    <Check className="mr-1.5 h-4 w-4" /> Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === r.id || r.message?.is_deleted}
                    onClick={() => act(r.id, "delete_message")}
                  >
                    {busyId === r.id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1.5 h-4 w-4" />
                    )}
                    Delete message
                  </Button>
                </div>
              ) : (
                r.reviewer && (
                  <p className="mt-2 text-right text-xs text-muted-foreground">
                    Resolved by{" "}
                    {r.reviewer.full_name?.trim() ||
                      (r.reviewer.username ? `@${r.reviewer.username}` : "admin")}
                  </p>
                )
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
