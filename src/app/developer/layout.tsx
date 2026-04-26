"use client";

import { useEffect, useState, useCallback } from "react";
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
  Loader2,
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
  const { user, setUser } = useAuthStore();
  const [plan, setPlan] = useState<string>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Auth check — since this layout is completely separate from (main)
  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      setUser(null);
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, username, first_name, last_name, full_name, avatar_url, auth_providers, is_email_verified, is_online, last_seen, totp_enabled, totp_verified_at, developer_plan, created_at, updated_at")
      .eq("id", authUser.id)
      .single();

    if (profile) {
      setUser(profile);
      setPlan(profile.developer_plan || "free");
    } else {
      router.push("/login");
      return;
    }

    setIsLoading(false);
  }, [router, setUser]);

  useEffect(() => {
    setMounted(true);
    // If we already have a user in the store, use it directly
    if (user) {
      setIsLoading(false);
      // Still fetch plan in background
      const supabase = createClient();
      supabase
        .from("profiles")
        .select("developer_plan")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.developer_plan) setPlan(data.developer_plan);
        });
    } else {
      checkAuth();
    }
  }, [user, checkAuth]);

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Developer Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    plus: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    pro: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-[260px] border-r border-border bg-sidebar flex-shrink-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate">Developer Portal</h1>
            <p className="text-[10px] text-muted-foreground truncate">Setu Public API</p>
          </div>
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
              >
                <item.icon
                  className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
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
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span>Back to Chat</span>
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span>Settings</span>
          </button>

          {/* Plan badge & user */}
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
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
