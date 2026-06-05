"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  ShieldOff,
  Search,
  Loader2,
  UserPlus,
  Info,
  Users,
  Flag,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  role: "user" | "admin";
}

function PersonRow({
  u,
  isSelf,
  children,
}: {
  u: AdminUser;
  isSelf?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <Avatar className="h-9 w-9">
        <AvatarImage src={u.avatar_url || ""} alt={u.full_name} />
        <AvatarFallback className="text-xs">
          {(u.full_name || u.email).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {u.full_name?.trim() || "—"}
          {isSelf && (
            <Badge variant="secondary" className="text-[10px]">
              You
            </Badge>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {u.username ? `@${u.username} · ` : ""}
          {u.email}
        </p>
      </div>
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [platform, setPlatform] = useState<{
    users_total: number;
    users_admins: number;
    reports_pending: number;
  } | null>(null);

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    const res = await fetch("/api/admin/users?role=admin");
    if (res.ok) setAdmins((await res.json()).users);
    setLoadingAdmins(false);
  }, []);

  useEffect(() => {
    loadAdmins();
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPlatform(d.stats));
  }, [loadAdmins]);

  // Search for non-admin users to promote.
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(
          (data.users as AdminUser[]).filter((u) => u.role !== "admin")
        );
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const setRole = async (id: string, action: "promote" | "demote") => {
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Action failed");
    } else {
      setQ("");
      setResults([]);
      await loadAdmins();
      fetch("/api/admin/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setPlatform(d.stats));
    }
    setBusyId(null);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage who can access the admin panel.
        </p>
      </header>

      {/* Platform info */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xl font-semibold">{platform?.users_total ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Total users</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <ShieldCheck className="h-5 w-5 text-purple-500" />
          <div>
            <p className="text-xl font-semibold">{platform?.users_admins ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <Flag className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-xl font-semibold">
              {platform?.reports_pending ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">Pending reports</p>
          </div>
        </div>
      </section>

      {/* Add admin */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Grant admin access</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search a user by name, username or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {q.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {searching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No matching non-admin users.
              </p>
            ) : (
              results.map((u) => (
                <PersonRow key={u.id} u={u}>
                  <Button
                    size="sm"
                    disabled={busyId === u.id}
                    onClick={() => setRole(u.id, "promote")}
                  >
                    {busyId === u.id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-1.5 h-4 w-4" />
                    )}
                    Make admin
                  </Button>
                </PersonRow>
              ))
            )}
          </div>
        )}
      </section>

      {/* Current admins */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">
            Current admins{admins.length > 0 && ` (${admins.length})`}
          </h2>
        </div>
        {loadingAdmins ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {admins.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <PersonRow key={u.id} u={u} isSelf={isSelf}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === u.id || isSelf}
                    title={isSelf ? "You can't remove your own admin access" : ""}
                    onClick={() => setRole(u.id, "demote")}
                  >
                    {busyId === u.id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldOff className="mr-1.5 h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </PersonRow>
              );
            })}
          </div>
        )}
      </section>

      {/* How admin works */}
      <section className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Admins sign in through the normal login — there is no separate admin
          password. Access is granted by the{" "}
          <span className="font-medium text-foreground">role</span> on their
          account, and every admin page and API re-checks it on the server. You
          can&rsquo;t remove your own access here (so the panel can never be
          locked out); ask another admin to do it. The very first admin is set
          directly in the database.
        </p>
      </section>
    </div>
  );
}
