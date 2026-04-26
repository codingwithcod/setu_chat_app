"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UsageData {
  summary: {
    total_requests: number;
    success_count: number;
    error_count: number;
    avg_response_time_ms: number;
    active_keys: number;
    active_webhooks: number;
  };
  plan: {
    current: string;
    limits: {
      max_api_keys: number;
      rate_limit_rpm: number;
      daily_request_limit: number;
      max_webhooks: number;
      display_name: string;
    } | null;
  };
  daily_stats: Record<string, { requests: number; errors: number }>;
  endpoint_stats: Record<string, number>;
  recent_activity: Array<{
    id: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number | null;
    ip_address: string | null;
    created_at: string;
  }>;
}

const methodColors: Record<string, string> = {
  GET: "text-emerald-500 bg-emerald-500/10",
  POST: "text-blue-500 bg-blue-500/10",
  PATCH: "text-amber-500 bg-amber-500/10",
  PUT: "text-amber-500 bg-amber-500/10",
  DELETE: "text-red-500 bg-red-500/10",
};

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchUsage = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/developer/usage?days=${days}`);
        const json = await res.json();
        if (json.data) setData(json.data);
      } catch (err) {
        console.error("Failed to load usage:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, [days]);

  const chartDays = data?.daily_stats
    ? Object.entries(data.daily_stats)
        .sort(([a], [b]) => a.localeCompare(b))
    : [];
  const maxReq = Math.max(1, ...chartDays.map(([, v]) => v.requests));

  const sortedEndpoints = data?.endpoint_stats
    ? Object.entries(data.endpoint_stats).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Usage & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detailed insights into your API usage patterns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              className="text-xs h-8"
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <Activity className="h-4 w-4 text-blue-500 mb-2" />
              <p className="text-xl font-bold">{data.summary.total_requests.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mb-2" />
              <p className="text-xl font-bold">{data.summary.success_count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <XCircle className="h-4 w-4 text-red-500 mb-2" />
              <p className="text-xl font-bold">{data.summary.error_count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <Clock className="h-4 w-4 text-amber-500 mb-2" />
              <p className="text-xl font-bold">{data.summary.avg_response_time_ms}ms</p>
              <p className="text-xs text-muted-foreground">Avg Response</p>
            </div>
          </div>

          {/* Plan Usage */}
          {data.plan.limits && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Plan Usage</h3>
                <Badge className="text-xs capitalize">{data.plan.current}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">API Keys</p>
                  <p className="text-sm font-medium">{data.summary.active_keys} / {data.plan.limits.max_api_keys}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (data.summary.active_keys / data.plan.limits.max_api_keys) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Webhooks</p>
                  <p className="text-sm font-medium">{data.summary.active_webhooks} / {data.plan.limits.max_webhooks}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${Math.min(100, (data.summary.active_webhooks / data.plan.limits.max_webhooks) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rate Limit</p>
                  <p className="text-sm font-medium">{data.plan.limits.rate_limit_rpm} RPM</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Daily Limit</p>
                  <p className="text-sm font-medium">{data.plan.limits.daily_request_limit.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-4">Daily Requests</h3>
              {chartDays.length > 0 ? (
                <div className="flex items-end gap-1.5 h-44">
                  {chartDays.map(([day, stats]) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">{stats.requests}</span>
                      <div className="w-full flex flex-col gap-0.5">
                        {stats.errors > 0 && (
                          <div
                            className="w-full bg-red-500/40 rounded-sm"
                            style={{ height: `${Math.max(2, (stats.errors / maxReq) * 140)}px` }}
                          />
                        )}
                        <div
                          className="w-full bg-primary/60 rounded-sm"
                          style={{ height: `${Math.max(3, ((stats.requests - stats.errors) / maxReq) * 140)}px` }}
                        />
                      </div>
                      <span className="text-[8px] text-muted-foreground">
                        {new Date(day).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">
                  No data for this period
                </div>
              )}
            </div>

            {/* Top Endpoints */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-4">Top Endpoints</h3>
              {sortedEndpoints.length > 0 ? (
                <div className="space-y-2">
                  {sortedEndpoints.slice(0, 8).map(([endpoint, count]) => {
                    const [method, ...pathParts] = endpoint.split(" ");
                    const path = pathParts.join(" ");
                    const percent = Math.round((count / data.summary.total_requests) * 100);
                    return (
                      <div key={endpoint} className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-12 text-center ${methodColors[method] || "bg-muted text-muted-foreground"}`}>
                          {method}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono truncate flex-1">{path}</span>
                        <span className="text-xs font-medium w-12 text-right">{count}</span>
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">
                  No endpoint data yet
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-4">Request Log</h3>
            {data.recent_activity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Endpoint</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">IP</th>
                      <th className="pb-2 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_activity.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2">
                          <span className={`font-bold px-1.5 py-0.5 rounded ${methodColors[item.method] || ""}`}>
                            {item.method}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-muted-foreground truncate max-w-[200px]">
                          {item.endpoint}
                        </td>
                        <td className="py-2">
                          <span className={item.status_code < 400 ? "text-emerald-500" : "text-red-500"}>
                            {item.status_code}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {item.response_time_ms ? `${item.response_time_ms}ms` : "—"}
                        </td>
                        <td className="py-2 text-muted-foreground font-mono">
                          {item.ip_address || "—"}
                        </td>
                        <td className="py-2 text-muted-foreground text-right">
                          {new Date(item.created_at).toLocaleString("en", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No requests logged yet</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-sm text-muted-foreground">
          Failed to load usage data.
        </div>
      )}
    </div>
  );
}
