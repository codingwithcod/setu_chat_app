"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ArrowLeft, Moon, Bell, Shield, HelpCircle, LogOut } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq("id", user?.id);
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push("/chat")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Appearance
            </h3>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Toggle dark/light mode</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Notifications
            </h3>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive browser notifications</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Account
            </h3>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Privacy & Security</p>
                <p className="text-xs text-muted-foreground">Manage your account security</p>
              </div>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Help & Support</p>
                <p className="text-xs text-muted-foreground">Get help with Setu</p>
              </div>
            </button>
          </div>

          <Separator />

          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
