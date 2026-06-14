"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Search,
  Loader2,
  UserPlus,
  Info,
  Users,
  Flag,
  Lock,
  UserCog,
  Ban,
  Trash2,
  KeyRound,
  Settings as SettingsIcon,
  ScrollText,
  ExternalLink,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  avatar_url: string | null;
  role: "user" | "admin";
  totp_enabled: boolean;
}

interface AuditEntry {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_label: string | null;
  created_at: string;
}

interface AppSettings {
  allow_registration: boolean;
  maintenance_mode: boolean;
}

const ACTION_META: Record<
  string,
  { label: string; icon: typeof UserCog; color: string }
> = {
  "user.promote": { label: "Promoted to admin", icon: ShieldCheck, color: "text-purple-500" },
  "user.demote": { label: "Removed admin", icon: ShieldOff, color: "text-muted-foreground" },
  "user.ban": { label: "Banned user", icon: Ban, color: "text-red-500" },
  "user.unban": { label: "Unbanned user", icon: ShieldCheck, color: "text-green-500" },
  "user.logout": { label: "Forced logout", icon: Lock, color: "text-amber-500" },
  "user.delete": { label: "Deleted user", icon: Trash2, color: "text-red-500" },
  "group.delete": { label: "Deleted group", icon: Trash2, color: "text-red-500" },
  "report.dismiss": { label: "Dismissed report", icon: Flag, color: "text-muted-foreground" },
  "message.delete": { label: "Deleted reported message", icon: Trash2, color: "text-red-500" },
  "api_key.revoke": { label: "Revoked API key", icon: KeyRound, color: "text-red-500" },
  "api_key.restore": { label: "Restored API key", icon: KeyRound, color: "text-green-500" },
  "settings.update": { label: "Updated setting", icon: SettingsIcon, color: "text-blue-500" },
};

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
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

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [savingFlag, setSavingFlag] = useState<string | null>(null);

  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    const res = await fetch("/api/admin/users?role=admin");
    if (res.ok) setAdmins((await res.json()).users);
    setLoadingAdmins(false);
  }, []);

  const loadStats = useCallback(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPlatform(d.stats));
  }, []);

  const loadAudit = useCallback(() => {
    fetch("/api/admin/audit")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAudit(d.entries));
  }, []);

  useEffect(() => {
    loadAdmins();
    loadStats();
    loadAudit();
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSettings(d.settings));
  }, [loadAdmins, loadStats, loadAudit]);

  // Search non-admin users to promote.
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
        setResults((data.users as AdminUser[]).filter((u) => u.role !== "admin"));
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
      loadStats();
      loadAudit();
    }
    setBusyId(null);
  };

  const toggleFlag = async (key: keyof AppSettings) => {
    if (!settings) return;
    setSavingFlag(key);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: !settings[key] }),
    });
    if (res.ok) {
      setSettings((await res.json()).settings);
      loadAudit();
    } else {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Could not update setting");
    }
    setSavingFlag(null);
  };

  const admins2fa = admins.filter((a) => a.totp_enabled).length;

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform controls, admin access and activity.
        </p>
      </header>

      {/* Your account */}
      {currentUser && (
        <section className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary/[0.06] to-card p-5">
          <Avatar className="h-14 w-14">
            <AvatarImage src={currentUser.avatar_url || ""} alt={currentUser.full_name} />
            <AvatarFallback>
              {(currentUser.full_name || currentUser.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-base font-semibold">
              {currentUser.full_name?.trim() || currentUser.email}
              <Badge className="bg-purple-500/15 text-purple-600">Admin</Badge>
            </p>
            <p className="truncate text-sm text-muted-foreground">{currentUser.email}</p>
            <div className="mt-1.5">
              {currentUser.totp_enabled ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> 2FA enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <ShieldAlert className="h-3.5 w-3.5" /> 2FA not enabled — recommended
                </span>
              )}
            </div>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              Manage <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </section>
      )}

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
            <p className="text-xl font-semibold">{platform?.reports_pending ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Pending reports</p>
          </div>
        </div>
      </section>

      {/* Platform toggles */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium">Platform controls</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Allow new sign-ups</p>
              <p className="text-xs text-muted-foreground">
                When off, the registration page is blocked for new users.
              </p>
            </div>
            {settings ? (
              <div className="flex items-center gap-2">
                {savingFlag === "allow_registration" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Toggle
                  checked={settings.allow_registration}
                  disabled={savingFlag !== null}
                  onChange={() => toggleFlag("allow_registration")}
                />
              </div>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Maintenance mode</p>
              <p className="text-xs text-muted-foreground">
                When on, only admins can use the app; everyone else sees a
                maintenance page.
              </p>
            </div>
            {settings ? (
              <div className="flex items-center gap-2">
                {savingFlag === "maintenance_mode" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Toggle
                  checked={settings.maintenance_mode}
                  disabled={savingFlag !== null}
                  onChange={() => toggleFlag("maintenance_mode")}
                />
              </div>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
        {settings?.maintenance_mode && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
            <ShieldAlert className="h-4 w-4" />
            Maintenance mode is ON — non-admin users currently cannot access the app.
          </div>
        )}
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

      {/* Current admins + 2FA security */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">
              Current admins{admins.length > 0 && ` (${admins.length})`}
            </h2>
          </div>
          {admins.length > 0 && (
            <span
              className={cn(
                "text-xs",
                admins2fa === admins.length ? "text-green-600" : "text-amber-600"
              )}
            >
              {admins2fa}/{admins.length} have 2FA
            </span>
          )}
        </div>

        {admins.length > 0 && admins2fa < admins.length && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Some admin accounts don&rsquo;t have 2FA enabled. Admin accounts are
            high-value — enabling 2FA is strongly recommended.
          </div>
        )}

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
                  {u.totp_enabled ? (
                    <Badge variant="outline" className="gap-1 text-green-600">
                      <ShieldCheck className="h-3 w-3" /> 2FA
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-amber-600">
                      <ShieldAlert className="h-3 w-3" /> No 2FA
                    </Badge>
                  )}
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

      {/* Audit log */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Recent admin activity</h2>
        </div>
        {audit.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No admin actions recorded yet.
          </p>
        ) : (
          <div className="space-y-1">
            {audit.map((e) => {
              const meta = ACTION_META[e.action] ?? {
                label: e.action,
                icon: UserCog,
                color: "text-muted-foreground",
              };
              const Icon = meta.icon;
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-accent/40"
                >
                  <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-medium">{meta.label}</span>
                      {e.target_label && (
                        <span className="text-muted-foreground"> · {e.target_label}</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.actor_email || "system"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(e.created_at)} · {formatTime(e.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* How admin works */}
      <section className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-4">
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
