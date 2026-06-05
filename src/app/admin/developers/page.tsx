"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/admin/StatCard";
import { formatDate } from "@/lib/utils";
import {
  KeyRound,
  Activity,
  AlertTriangle,
  Webhook,
  Gauge,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Ban,
  RotateCcw,
} from "lucide-react";

interface DevStats {
  keys_total: number;
  keys_active: number;
  requests_24h: number;
  requests_7d: number;
  errors_24h: number;
  avg_response_ms_24h: number;
  webhooks_total: number;
  webhooks_active: number;
  deliveries_7d: number;
  deliveries_failed_7d: number;
}

interface Owner {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
}

interface Consumer {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  requests: number;
  errors: number;
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_rpm: number;
  total_requests: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  owner: Owner | null;
}

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
  owner: Owner | null;
}

function OwnerCell({ owner }: { owner: Owner | null }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={owner?.avatar_url || ""} alt={owner?.full_name} />
        <AvatarFallback className="text-[10px]">
          {(owner?.full_name || "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-xs">
        {owner?.full_name?.trim() ||
          (owner?.username ? `@${owner.username}` : "—")}
      </span>
    </div>
  );
}

export default function AdminDevelopersPage() {
  const [stats, setStats] = useState<DevStats | null>(null);
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [tab, setTab] = useState<"keys" | "webhooks">("keys");

  // shared list state
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);

  // Load overview once.
  useEffect(() => {
    fetch("/api/admin/developers/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setStats(d.stats);
          setConsumers(d.topConsumers);
        }
      });
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    const endpoint =
      tab === "keys"
        ? `/api/admin/developers/keys?${params}`
        : `/api/admin/developers/webhooks?${params}`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (tab === "keys") setKeys(data.keys);
      else setWebhooks(data.webhooks);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [tab, page, q]);

  useEffect(() => {
    const t = setTimeout(loadList, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadList, q]);

  const switchTab = (next: "keys" | "webhooks") => {
    setTab(next);
    setPage(1);
    setQ("");
  };

  const toggleKey = async (id: string, active: boolean) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/developers/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: active ? "revoke" : "restore" }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Action failed");
    }
    setBusyId(null);
    loadList();
  };

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Developers</h1>
        <p className="text-sm text-muted-foreground">
          API keys, request volume and webhooks across the platform.
        </p>
      </header>

      {/* Overview */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="API Keys"
          value={stats?.keys_total ?? 0}
          icon={KeyRound}
          hint={`${stats?.keys_active ?? 0} active`}
        />
        <StatCard
          label="Requests (24h)"
          value={stats?.requests_24h ?? 0}
          icon={Activity}
          accent="text-blue-500"
          hint={`${stats?.requests_7d ?? 0} in last 7 days`}
        />
        <StatCard
          label="Errors (24h)"
          value={stats?.errors_24h ?? 0}
          icon={AlertTriangle}
          accent="text-red-500"
          hint={`avg ${stats?.avg_response_ms_24h ?? 0}ms response`}
        />
        <StatCard
          label="Webhooks"
          value={stats?.webhooks_total ?? 0}
          icon={Webhook}
          accent="text-purple-500"
          hint={`${stats?.webhooks_active ?? 0} active · ${
            stats?.deliveries_failed_7d ?? 0
          } failed (7d)`}
        />
      </section>

      {/* Top consumers */}
      {consumers.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Top API consumers · last 7 days</h3>
          </div>
          <div className="space-y-2">
            {consumers.map((c, i) => (
              <div key={c.user_id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                <OwnerCell
                  owner={{
                    id: c.user_id,
                    full_name: c.full_name,
                    username: c.username,
                    avatar_url: c.avatar_url,
                  }}
                />
                <div className="ml-auto flex items-center gap-4 text-xs">
                  {c.errors > 0 && (
                    <span className="text-red-500">{c.errors} errors</span>
                  )}
                  <span className="font-medium">{c.requests} req</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2">
        <Button
          size="sm"
          variant={tab === "keys" ? "default" : "outline"}
          onClick={() => switchTab("keys")}
        >
          API Keys
        </Button>
        <Button
          size="sm"
          variant={tab === "webhooks" ? "default" : "outline"}
          onClick={() => switchTab("webhooks")}
        >
          Webhooks
        </Button>
        <div className="relative ml-auto w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${tab} by name…`}
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          {tab === "keys" ? (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Requests</th>
                  <th className="px-4 py-3 font-medium">Rate</th>
                  <th className="px-4 py-3 font-medium">Last used</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No API keys found.
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{k.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {k.key_prefix}…
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <OwnerCell owner={k.owner} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {k.total_requests.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {k.rate_limit_rpm}/min
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {k.last_used_at ? formatDate(k.last_used_at) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        {k.is_active ? (
                          <Badge variant="secondary" className="bg-green-500/15 text-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">Revoked</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === k.id}
                          onClick={() => toggleKey(k.id, k.is_active)}
                        >
                          {busyId === k.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : k.is_active ? (
                            <>
                              <Ban className="mr-1.5 h-4 w-4 text-destructive" /> Revoke
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-1.5 h-4 w-4" /> Restore
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Webhook</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Events</th>
                  <th className="px-4 py-3 font-medium">Last fired</th>
                  <th className="px-4 py-3 font-medium">Failures</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No webhooks found.
                    </td>
                  </tr>
                ) : (
                  webhooks.map((w) => (
                    <tr key={w.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{w.name}</p>
                        <p className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                          {w.url}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <OwnerCell owner={w.owner} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {w.events?.length || 0} event{w.events?.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {w.last_triggered_at ? formatDate(w.last_triggered_at) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        {w.failure_count > 0 ? (
                          <span className="text-red-500">{w.failure_count}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.is_active ? (
                          <Badge variant="secondary" className="bg-green-500/15 text-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} total · page {page} of {totalPages}
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
