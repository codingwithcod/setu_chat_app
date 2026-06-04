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
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  LogOut,
} from "lucide-react";

interface AdminSession {
  id: string;
  device_name: string;
  device_type:
    | "desktop_app"
    | "desktop_browser"
    | "mobile_app"
    | "mobile_browser"
    | "tablet_browser";
  browser_name: string | null;
  os_name: string | null;
  ip_address: string | null;
  location: string | null;
  last_active_at: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    username: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "active", label: "Active now" },
  { key: "idle", label: "Idle" },
];

const DEVICE_FILTERS = [
  { key: "", label: "Any device" },
  { key: "desktop", label: "Desktop" },
  { key: "mobile", label: "Mobile" },
  { key: "tablet", label: "Tablet" },
];

function DeviceIcon({ type }: { type: AdminSession["device_type"] }) {
  if (type.startsWith("mobile")) return <Smartphone className="h-4 w-4" />;
  if (type.startsWith("tablet")) return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeSince, setActiveSince] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [device, setDevice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    if (device) params.set("device", device);
    const res = await fetch(`/api/admin/sessions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setActiveSince(data.activeSince);
    }
    setLoading(false);
  }, [page, status, device]);

  useEffect(() => {
    load();
  }, [load]);

  const isActive = (s: AdminSession) =>
    activeSince ? s.last_active_at >= activeSince : false;

  const revoke = async (id: string) => {
    if (!confirm("Revoke this session? The device will be logged out.")) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Revoke failed");
    }
    setBusyId(null);
    load();
  };

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          {total} device session{total === 1 ? "" : "s"} · &ldquo;active&rdquo;
          means seen in the last 5 minutes.
        </p>
      </header>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        <span className="mx-1 h-5 w-px bg-border" />
        {DEVICE_FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={device === f.key ? "default" : "outline"}
            onClick={() => {
              setPage(1);
              setDevice(f.key);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Device</th>
              <th className="px-4 py-3 font-medium">Location / IP</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No sessions found.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={s.user?.avatar_url || ""} alt={s.user?.full_name} />
                        <AvatarFallback className="text-xs">
                          {(s.user?.full_name || s.user?.email || "?")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {s.user?.full_name?.trim() || "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.user?.username ? `@${s.user.username}` : s.user?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        <DeviceIcon type={s.device_type} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate">{s.device_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[s.browser_name, s.os_name].filter(Boolean).join(" · ") ||
                            s.device_type.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {s.location || s.ip_address || "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {isActive(s) ? (
                        <Badge variant="secondary" className="w-fit bg-green-500/15 text-green-600">
                          Active now
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(s.last_active_at)} · {formatTime(s.last_active_at)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busyId === s.id}
                      onClick={() => revoke(s.id)}
                      title="Revoke session"
                    >
                      {busyId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
