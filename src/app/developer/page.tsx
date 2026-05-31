"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  Webhook,
  BarChart3,
  BookOpen,
  Activity,
  ArrowUpRight,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  recent_activity: Array<{
    id: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number | null;
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

export default function DeveloperOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/developer/usage?days=7");
        const json = await res.json();
        if (json.data) setData(json.data);
      } catch (err) {
        console.error("Failed to load usage:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  const statCards = data
    ? [
        {
          label: "Total Requests",
          value: data.summary.total_requests.toLocaleString(),
          sub: "Last 7 days",
          icon: Activity,
          gradient: "from-blue-500/15 to-cyan-500/15",
          iconColor: "text-blue-500",
        },
        {
          label: "Active API Keys",
          value: data.summary.active_keys.toString(),
          sub: data.plan.limits
            ? `of ${data.plan.limits.max_api_keys} (${data.plan.limits.display_name})`
            : "Free plan",
          icon: Key,
          gradient: "from-violet-500/15 to-purple-500/15",
          iconColor: "text-violet-500",
        },
        {
          label: "Avg Response Time",
          value: `${data.summary.avg_response_time_ms}ms`,
          sub: "Last 7 days",
          icon: Clock,
          gradient: "from-amber-500/15 to-orange-500/15",
          iconColor: "text-amber-500",
        },
        {
          label: "Success Rate",
          value:
            data.summary.total_requests > 0
              ? `${Math.round(
                  (data.summary.success_count / data.summary.total_requests) * 100
                )}%`
              : "—",
          sub: `${data.summary.success_count} ok / ${data.summary.error_count} errors`,
          icon: TrendingUp,
          gradient: "from-emerald-500/15 to-teal-500/15",
          iconColor: "text-emerald-500",
        },
      ]
    : [];

  const quickActions = [
    { label: "Create API Key", icon: Plus, href: "/developer/keys", color: "from-primary to-primary/80" },
    { label: "Add Webhook", icon: Webhook, href: "/developer/webhooks", color: "from-violet-500 to-purple-500" },
    { label: "View Analytics", icon: BarChart3, href: "/developer/usage", color: "from-amber-500 to-orange-500" },
    { label: "Read Docs", icon: BookOpen, href: "/developer/docs", color: "from-emerald-500 to-teal-500" },
  ];

  // Fill all 7 days (including days with zero requests)
  const chartDays = (() => {
    const result: Array<[string, { requests: number; errors: number }]> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push([key, data?.daily_stats?.[key] || { requests: 0, errors: 0 }]);
    }
    return result;
  })();
  const maxRequests = Math.max(1, ...chartDays.map(([, v]) => v.requests));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">API Studio</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-[42px]">
          Monitor your API usage, manage keys, and configure webhooks.
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[120px] rounded-xl border border-border bg-card animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-xl border border-border bg-card p-5 hover:border-primary/20 transition-colors group"
            >
              <div
                className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} -translate-y-8 translate-x-8 opacity-60 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Usage Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-sm">API Requests</h3>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Success</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-red-500" />
                  <span className="text-[10px] text-muted-foreground">Errors</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => router.push("/developer/usage")}
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {data ? (
            <div className="flex items-end gap-2 flex-1 min-h-[160px]">
              {chartDays.map(([day, stats], idx) => {
                const successCount = stats.requests - stats.errors;
                const successHeight = maxRequests > 0 ? Math.max(successCount > 0 ? 6 : 3, (successCount / maxRequests) * 100) : 3;
                const errorHeight = stats.errors > 0 ? Math.max(6, (stats.errors / maxRequests) * 100) : 0;
                const isToday = day === new Date().toISOString().slice(0, 10);
                const tooltipAlign = idx < 2 ? "left-0" : idx > 4 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative cursor-crosshair">
                    {/* Hover tooltip */}
                    <div className={`absolute bottom-full mb-2 ${tooltipAlign} hidden group-hover:block z-10`}>
                      <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
                        <p className="text-[10px] font-medium text-foreground mb-1">
                          {new Date(day).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-emerald-400">Success: {successCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="text-red-400">Errors: {stats.errors}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 border-t border-border pt-1">Total: {stats.requests}</p>
                      </div>
                    </div>
                    {/* Count on hover */}
                    <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {stats.requests}
                    </span>
                    {/* Bars */}
                    <div className="w-full flex flex-col gap-0.5 group-hover:opacity-80 transition-opacity">
                      {stats.errors > 0 && (
                        <div
                          className="w-full bg-red-500 rounded-sm"
                          style={{ height: `${errorHeight}px` }}
                        />
                      )}
                      <div
                        className={`w-full rounded-sm ${stats.requests === 0 ? "bg-muted/40" : "bg-emerald-500"}`}
                        style={{ height: `${successHeight}px` }}
                      />
                    </div>
                    {/* Day label */}
                    <span className={`text-[9px] text-muted-foreground ${isToday ? "font-bold text-foreground" : ""}`}>
                      {new Date(day).toLocaleDateString("en", { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No API requests yet. Create a key and start building!
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors group text-left"
              >
                <div
                  className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}
                >
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm">Recent Activity</h3>
            <p className="text-xs text-muted-foreground">Latest API requests</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => router.push("/developer/usage")}
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>

        {data?.recent_activity && data.recent_activity.length > 0 ? (
          <div className="space-y-1">
            {data.recent_activity.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-sm"
              >
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    methodColors[item.method] || "text-muted-foreground bg-muted"
                  }`}
                >
                  {item.method}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                  {item.endpoint}
                </span>
                {item.status_code < 400 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                )}
                <span className="text-[10px] text-muted-foreground w-12 text-right">
                  {item.response_time_ms ? `${item.response_time_ms}ms` : "—"}
                </span>
                <span className="text-[10px] text-muted-foreground w-16 text-right">
                  {new Date(item.created_at).toLocaleTimeString("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              API requests will appear here once you start using your keys.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
