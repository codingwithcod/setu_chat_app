"use client";

import { MessageSquare, Users, Zap, Globe } from "lucide-react";

const stats = [
  { icon: MessageSquare, label: "Messages Sent Daily", value: "10M+", color: "text-primary" },
  { icon: Users, label: "Active Users", value: "500K+", color: "text-emerald-500" },
  { icon: Zap, label: "Uptime", value: "99.9%", color: "text-amber-500" },
  { icon: Globe, label: "Countries", value: "120+", color: "text-blue-500" },
];

export default function StatsSection() {
  return (
    <section className="relative py-20 -mt-10 z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="animate-on-scroll grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="landing-card rounded-2xl p-6 text-center group"
            >
              <s.icon className={`h-8 w-8 mx-auto mb-3 ${s.color} transition-transform group-hover:scale-110`} />
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
