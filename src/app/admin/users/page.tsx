"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import {
  Search,
  MoreVertical,
  ShieldCheck,
  ShieldOff,
  Ban,
  LogOut,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  auth_providers: string[];
  is_email_verified: boolean;
  is_online: boolean;
  is_banned: boolean;
  role: "user" | "admin";
  totp_enabled: boolean;
  last_seen: string;
  created_at: string;
}

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "online", label: "Online" },
  { key: "verified", label: "Verified" },
  { key: "banned", label: "Banned" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (role) params.set("role", role);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [page, q, status, role]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const act = async (
    id: string,
    action: "promote" | "demote" | "ban" | "unban" | "logout"
  ) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
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

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This permanently removes the account.`)) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
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
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          {total} total user{total === 1 ? "" : "s"}.
        </p>
      </header>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, username…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            size="sm"
            variant={role === "admin" ? "default" : "outline"}
            onClick={() => {
              setPage(1);
              setRole(role === "admin" ? "" : "admin");
            }}
          >
            Admins
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar_url || ""} alt={u.full_name} />
                        <AvatarFallback className="text-xs">
                          {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {u.full_name?.trim() || "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.username ? `@${u.username} · ` : ""}
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                      {u.is_online ? (
                        <Badge variant="secondary" className="bg-green-500/15 text-green-600">
                          Online
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {u.last_seen ? formatDate(u.last_seen) : "Offline"}
                        </span>
                      )}
                      {u.totp_enabled && <Badge variant="outline">2FA</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <Badge className="bg-purple-500/15 text-purple-600">Admin</Badge>
                    ) : (
                      <span className="text-muted-foreground">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(u.auth_providers || []).join(", ") || "email"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={busyId === u.id}>
                          {busyId === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {u.role === "admin" ? (
                          <DropdownMenuItem onClick={() => act(u.id, "demote")}>
                            <ShieldOff className="mr-2 h-4 w-4" /> Remove admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => act(u.id, "promote")}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Make admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => act(u.id, "logout")}>
                          <LogOut className="mr-2 h-4 w-4" /> Force logout
                        </DropdownMenuItem>
                        {u.is_banned ? (
                          <DropdownMenuItem onClick={() => act(u.id, "unban")}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Unban
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => act(u.id, "ban")}
                          >
                            <Ban className="mr-2 h-4 w-4" /> Ban user
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => remove(u.id, u.full_name || u.email)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
