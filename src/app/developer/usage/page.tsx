"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Filter,
  AlertTriangle,
  X,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecentActivity {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  error_message: string | null;
  created_at: string;
}

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
  recent_activity: RecentActivity[];
}

const methodColors: Record<string, string> = {
  GET: "text-emerald-500 bg-emerald-500/10",
  POST: "text-blue-500 bg-blue-500/10",
  PATCH: "text-amber-500 bg-amber-500/10",
  PUT: "text-amber-500 bg-amber-500/10",
  DELETE: "text-red-500 bg-red-500/10",
};

const statusLabels: Record<string, string> = {
  "400": "Bad Request",
  "401": "Unauthorized",
  "403": "Forbidden",
  "404": "Not Found",
  "429": "Rate Limit Exceeded",
  "500": "Internal Server Error",
};

// ── Error Detail Modal ─────────────────────────────────────
function ErrorDetailModal({
  item,
  onClose,
}: {
  item: RecentActivity;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(item.error_message || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [item.error_message]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const [errorCode, ...errorMsgParts] = (item.error_message || "Unknown error").split(": ");
  const errorMsg = errorMsgParts.join(": ") || errorCode;
  const displayCode = errorMsgParts.length > 0 ? errorCode : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-red-500/20 bg-card shadow-2xl shadow-red-500/5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Request Error</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(item.created_at).toLocaleString("en", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status + Method + Endpoint */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Method</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${methodColors[item.method] || ""}`}>
                {item.method}
              </span>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-red-500">{item.status_code}</span>
                <span className="text-xs text-muted-foreground">
                  {statusLabels[String(item.status_code)] || "Error"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Endpoint</p>
            <code className="text-xs font-mono text-foreground break-all">{item.endpoint}</code>
          </div>

          {/* Error Code */}
          {displayCode && (
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Error Code</p>
              <code className="text-xs font-mono text-red-400">{displayCode}</code>
            </div>
          )}

          {/* Error Message */}
          <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-red-400">Error Message</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-red-300 leading-relaxed font-mono whitespace-pre-wrap break-all">
              {errorMsg || "No error details available"}
            </p>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Response Time</p>
              <p className="text-xs text-foreground">
                {item.response_time_ms ? `${item.response_time_ms}ms` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">IP Address</p>
              <p className="text-xs text-foreground font-mono">
                {item.ip_address || "—"}
              </p>
            </div>
          </div>

          {item.user_agent && (
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">User Agent</p>
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed break-all">
                {item.user_agent}
              </p>
            </div>
          )}

          {/* How to fix hint */}
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-amber-400 mb-1.5">💡 How to fix</p>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              {item.status_code === 400 &&
                "Check your request body format. Ensure all required fields are provided and the JSON is valid."}
              {item.status_code === 401 &&
                "Your API key is invalid or missing. Verify the Bearer token in the Authorization header."}
              {item.status_code === 403 &&
                "Your API key doesn't have the required permission scope. Update the key's permissions in the API Keys page."}
              {item.status_code === 404 &&
                "The requested resource was not found. Check the endpoint URL and resource IDs."}
              {item.status_code === 429 &&
                "You've exceeded the rate limit. Wait for the reset window or upgrade your plan for higher limits."}
              {item.status_code >= 500 &&
                "This is a server-side error. If it persists, please contact support or check your request payload for issues."}
              {![400, 401, 403, 404, 429].includes(item.status_code) &&
                item.status_code < 500 &&
                "Review the error message above and adjust your request accordingly."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 pt-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [selectedItem, setSelectedItem] = useState<RecentActivity | null>(null);

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
                    {data.recent_activity.map((item) => {
                      const isError = item.status_code >= 400;
                      const hasErrorMessage = !!item.error_message;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-border/50 transition-colors ${
                            isError && hasErrorMessage
                              ? "hover:bg-red-500/5 cursor-pointer group"
                              : "hover:bg-muted/30"
                          }`}
                          onClick={() => {
                            if (isError && hasErrorMessage) setSelectedItem(item);
                          }}
                        >
                          <td className="py-2">
                            <span className={`font-bold px-1.5 py-0.5 rounded ${methodColors[item.method] || ""}`}>
                              {item.method}
                            </span>
                          </td>
                          <td className="py-2 font-mono text-muted-foreground truncate max-w-[200px]">
                            {item.endpoint}
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-1.5">
                              <span className={isError ? "text-red-500" : "text-emerald-500"}>
                                {item.status_code}
                              </span>
                              {isError && hasErrorMessage && (
                                <AlertTriangle className="h-3 w-3 text-red-500/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {item.response_time_ms ? `${item.response_time_ms}ms` : "—"}
                          </td>
                          <td className="py-2 text-muted-foreground font-mono">
                            {item.ip_address || "—"}
                          </td>
                          <td className="py-2 text-muted-foreground text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span>
                                {new Date(item.created_at).toLocaleString("en", {
                                  month: "short", day: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                              {isError && hasErrorMessage && (
                                <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  View Error
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* Error Detail Modal */}
      {selectedItem && (
        <ErrorDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
