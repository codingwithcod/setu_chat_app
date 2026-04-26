"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Key,
  Webhook,
  BarChart3,
  BookOpen,
  ArrowLeft,
  Settings,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/developer", label: "Overview", icon: LayoutDashboard },
  { href: "/developer/keys", label: "API Keys", icon: Key },
  { href: "/developer/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/developer/usage", label: "Usage & Analytics", icon: BarChart3 },
  { href: "/developer/docs", label: "Documentation", icon: BookOpen },
];

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [plan, setPlan] = useState<string>("free");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("developer_plan")
        .eq("id", user?.id)
        .single();
      if (data?.developer_plan) {
        setPlan(data.developer_plan);
      }
    };
    if (user?.id) fetchPlan();
  }, [user?.id]);

  if (!user) return null;

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    plus: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    pro: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          sidebarCollapsed ? "w-[68px]" : "w-[260px]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate">Developer Portal</h1>
              <p className="text-[10px] text-muted-foreground truncate">Setu Public API</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2 space-y-1">
          <button
            onClick={() => router.push("/chat")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            title={sidebarCollapsed ? "Back to Chat" : undefined}
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>Back to Chat</span>}
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            title={sidebarCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>

          {/* Plan badge & user */}
          {!sidebarCollapsed && (
            <div className="px-3 py-2.5 mt-1 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(user.first_name, user.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${planColors[plan]}`}
                    >
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </span>
                    <button
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      onClick={() => {/* TODO: upgrade flow */}}
                    >
                      Upgrade <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
