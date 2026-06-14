"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import { BreakdownBar } from "@/components/admin/BreakdownBar";
import { Sun, CalendarDays, CalendarRange, Repeat, Loader2, Info } from "lucide-react";

interface Overview {
  dau: number;
  wau: number;
  mau: number;
  users_total: number;
  provider_email: number;
  provider_google: number;
  conv_group: number;
  conv_private: number;
  msg_text: number;
  msg_image: number;
  msg_file: number;
  msg_total: number;
}

interface TrendPoint {
  day: string;
  signups: number;
  messages: number;
}

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/analytics?days=${days}`);
    if (res.ok) {
      const data = await res.json();
      setOverview(data.overview);
      setTrend(data.trend);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const stickiness =
    overview && overview.mau > 0
      ? Math.round((overview.dau / overview.mau) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Active users, growth and content trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={days === r.days ? "default" : "outline"}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </header>

      {/* Active users */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Daily Active (DAU)"
          value={overview?.dau ?? 0}
          icon={Sun}
          accent="text-amber-500"
        />
        <StatCard
          label="Weekly Active (WAU)"
          value={overview?.wau ?? 0}
          icon={CalendarDays}
          accent="text-blue-500"
        />
        <StatCard
          label="Monthly Active (MAU)"
          value={overview?.mau ?? 0}
          icon={CalendarRange}
          accent="text-purple-500"
        />
        <StatCard
          label="Stickiness (DAU/MAU)"
          value={`${stickiness}%`}
          icon={Repeat}
          accent="text-green-500"
          hint="Higher = users return more often"
        />
      </section>

      {/* Trends */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          <>
            <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : (
          <>
            <TrendChart
              title={`New signups · last ${days} days`}
              data={trend.map((t) => ({ label: t.day, value: t.signups }))}
              color="bg-blue-500"
            />
            <TrendChart
              title={`Messages · last ${days} days`}
              data={trend.map((t) => ({ label: t.day, value: t.messages }))}
              color="bg-primary"
            />
          </>
        )}
      </section>

      {/* Breakdowns */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownBar
          title="Auth provider"
          segments={[
            { label: "Email", value: overview?.provider_email ?? 0, color: "bg-blue-500" },
            { label: "Google", value: overview?.provider_google ?? 0, color: "bg-red-500" },
          ]}
        />
        <BreakdownBar
          title="Conversations"
          segments={[
            { label: "Private", value: overview?.conv_private ?? 0, color: "bg-primary" },
            { label: "Group", value: overview?.conv_group ?? 0, color: "bg-purple-500" },
          ]}
        />
        <BreakdownBar
          title="Message types"
          segments={[
            { label: "Text", value: overview?.msg_text ?? 0, color: "bg-green-500" },
            { label: "Image", value: overview?.msg_image ?? 0, color: "bg-amber-500" },
            { label: "File", value: overview?.msg_file ?? 0, color: "bg-sky-500" },
          ]}
        />
      </section>

      {/* Premium glossary */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/[0.07] via-card to-card shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
            <Info className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Understanding these metrics
            </h3>
            <p className="text-xs text-muted-foreground">
              The standard way product teams measure real engagement.
            </p>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              abbr: "DAU",
              full: "Daily Active Users",
              desc: "Unique people active in the last 24 hours.",
              icon: Sun,
              accent: "text-amber-500",
              chip: "bg-amber-500/10 ring-amber-500/20",
            },
            {
              abbr: "WAU",
              full: "Weekly Active Users",
              desc: "Unique people active in the last 7 days.",
              icon: CalendarDays,
              accent: "text-blue-500",
              chip: "bg-blue-500/10 ring-blue-500/20",
            },
            {
              abbr: "MAU",
              full: "Monthly Active Users",
              desc: "Unique people active in the last 30 days.",
              icon: CalendarRange,
              accent: "text-purple-500",
              chip: "bg-purple-500/10 ring-purple-500/20",
            },
            {
              abbr: "Stickiness",
              full: "DAU ÷ MAU",
              desc: "Share of monthly users who return daily — higher means more habit-forming.",
              icon: Repeat,
              accent: "text-green-500",
              chip: "bg-green-500/10 ring-green-500/20",
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.abbr}
                className="group bg-card p-5 transition-colors hover:bg-accent/30"
              >
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${m.chip}`}
                >
                  <Icon className={`h-5 w-5 ${m.accent}`} />
                </div>
                <p className="text-base font-semibold tracking-tight">{m.abbr}</p>
                <p className={`text-xs font-medium ${m.accent}`}>{m.full}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {m.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <div className="border-t border-border/60 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            &ldquo;Active&rdquo; is based on each user&rsquo;s last-seen time. As a
            benchmark, chat apps with strong retention often see stickiness above
            ~30%.
          </p>
        </div>
      </section>
    </div>
  );
}
