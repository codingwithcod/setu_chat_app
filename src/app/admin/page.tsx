import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/auth";
import { StatCard } from "@/components/admin/StatCard";
import { TrendChart } from "@/components/admin/TrendChart";
import {
  Users,
  UserCheck,
  UsersRound,
  MessageSquare,
  ShieldAlert,
  KeyRound,
  Activity,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Stats {
  users_total: number;
  users_online: number;
  users_banned: number;
  users_verified: number;
  users_2fa: number;
  users_admins: number;
  signups_today: number;
  signups_7d: number;
  signups_30d: number;
  groups_total: number;
  private_total: number;
  messages_total: number;
  messages_today: number;
  messages_7d: number;
  sessions_active: number;
  api_keys_active: number;
}

interface TrendPoint {
  day: string;
  signups: number;
  messages: number;
}

export default async function AdminDashboardPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/chat");

  const [statsRes, trendRes] = await Promise.all([
    ctx.serviceClient.rpc("admin_platform_stats"),
    ctx.serviceClient.rpc("admin_daily_trend", { days: 14 }),
  ]);

  const s = (statsRes.data ?? {}) as Stats;
  const trend = (trendRes.data ?? []) as TrendPoint[];

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform overview and activity at a glance.
        </p>
      </header>

      {/* Primary counters */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={s.users_total ?? 0}
          icon={Users}
          hint={`${s.users_verified ?? 0} verified · ${s.users_2fa ?? 0} with 2FA`}
        />
        <StatCard
          label="Online Now"
          value={s.users_online ?? 0}
          icon={Activity}
          accent="text-green-500"
          hint={`${s.sessions_active ?? 0} active sessions`}
        />
        <StatCard
          label="Groups"
          value={s.groups_total ?? 0}
          icon={UsersRound}
          hint={`${s.private_total ?? 0} private chats`}
        />
        <StatCard
          label="Total Messages"
          value={s.messages_total ?? 0}
          icon={MessageSquare}
          hint={`${s.messages_today ?? 0} today · ${s.messages_7d ?? 0} this week`}
        />
      </section>

      {/* Secondary counters */}
      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="New Signups (Today)"
          value={s.signups_today ?? 0}
          icon={TrendingUp}
          accent="text-blue-500"
          hint={`${s.signups_7d ?? 0} this week · ${s.signups_30d ?? 0} this month`}
        />
        <StatCard
          label="Admins"
          value={s.users_admins ?? 0}
          icon={UserCheck}
          accent="text-purple-500"
        />
        <StatCard
          label="Banned Users"
          value={s.users_banned ?? 0}
          icon={ShieldAlert}
          accent="text-red-500"
        />
        <StatCard
          label="Active API Keys"
          value={s.api_keys_active ?? 0}
          icon={KeyRound}
          accent="text-amber-500"
        />
      </section>

      {/* Trend */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart
          title="Signups · last 14 days"
          data={trend.map((t) => ({ label: t.day, value: t.signups }))}
          color="bg-blue-500"
        />
        <TrendChart
          title="Messages · last 14 days"
          data={trend.map((t) => ({ label: t.day, value: t.messages }))}
          color="bg-primary"
        />
      </section>
    </div>
  );
}
