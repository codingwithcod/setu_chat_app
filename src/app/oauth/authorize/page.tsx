"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { DevelopedBy } from "@/components/shared/DevelopedBy";
import setuLogo from "@/app/setu-white-tr.png";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  LogIn,
} from "lucide-react";

// ── Scope display names & icons ─────────────────────────────
const SCOPE_GROUPS: Record<string, { label: string; description: string }> = {
  "messages:send": { label: "Send Messages", description: "Send messages to your conversations" },
  "messages:read": { label: "Read Messages", description: "Read messages in your conversations" },
  "messages:edit": { label: "Edit Messages", description: "Edit messages you've sent" },
  "messages:delete": { label: "Delete Messages", description: "Delete messages you've sent" },
  "conversations:create": { label: "Create Conversations", description: "Start new private or group chats" },
  "conversations:read": { label: "Read Conversations", description: "View your conversations and members" },
  "conversations:update": { label: "Update Conversations", description: "Modify conversation settings" },
  "conversations:delete": { label: "Delete Conversations", description: "Delete conversations" },
  "members:add": { label: "Add Members", description: "Add members to group chats" },
  "members:remove": { label: "Remove Members", description: "Remove members from group chats" },
  "members:list": { label: "List Members", description: "View group members" },
  "users:search": { label: "Search Users", description: "Search for users by name" },
  "users:profile": { label: "View Profiles", description: "View user profiles" },
  "files:upload": { label: "Upload Files", description: "Upload files to conversations" },
  "files:read": { label: "Read Files", description: "Access shared files" },
  "webhooks:manage": { label: "Manage Webhooks", description: "Create and manage webhooks" },
  "webhooks:read": { label: "Read Webhooks", description: "View webhook configurations" },
  "account:read": { label: "Account Info", description: "View your account information" },
};

function AuthorizeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // OAuth query params
  const clientId = searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const responseType = searchParams.get("response_type") || "";
  const scope = searchParams.get("scope") || "";
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "S256";

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [clientName, setClientName] = useState("");
  const [showAllScopes, setShowAllScopes] = useState(false);

  const requestedScopes = scope.split(/\s+/).filter(Boolean);
  const displayScopes = showAllScopes ? requestedScopes : requestedScopes.slice(0, 5);

  // Check auth & validate params on mount
  useEffect(() => {
    async function init() {
      // Validate required params
      if (!clientId || !redirectUri || responseType !== "code" || !codeChallenge) {
        setError("Invalid authorization request. Missing required parameters.");
        setIsLoading(false);
        return;
      }

      // Check if user is logged in
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        // Redirect to login with return URL
        const returnUrl = `/oauth/authorize?${searchParams.toString()}`;
        router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email || "",
        name: profile?.full_name || profile?.username || authUser.email || "",
      });

      // Validate client
      try {
        const res = await fetch(`/api/oauth/validate-client?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`);
        if (res.ok) {
          const data = await res.json();
          setClientName(data.client_name || clientId);
        } else {
          setError("Unknown or invalid application. The client_id or redirect_uri is not registered.");
          setIsLoading(false);
          return;
        }
      } catch {
        setClientName(clientId);
      }

      setIsLoading(false);
    }

    init();
  }, [clientId, redirectUri, responseType, codeChallenge, searchParams, router, supabase]);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    setError("");

    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error_description || "Authorization failed");
        setIsAuthorizing(false);
        return;
      }

      const { code } = await res.json();

      // Redirect back to client with authorization code
      const url = new URL(redirectUri);
      url.searchParams.set("code", code);
      if (state) url.searchParams.set("state", state);

      window.location.href = url.toString();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsAuthorizing(false);
    }
  };

  const handleDeny = () => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("error_description", "The user denied the authorization request");
    if (state) url.searchParams.set("state", state);
    window.location.href = url.toString();
  };

  // ── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        {/* Background effects */}
        <div className="fixed inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(var(--primary)/0.08),transparent_60%)]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in">
          {/* Logo with glow */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-xl animate-pulse" />
            <div className="relative rounded-2xl bg-primary p-4 overflow-hidden shadow-xl shadow-primary/25">
              <Image src={setuLogo} alt="Setu logo" width={40} height={40} className="object-contain" />
            </div>
          </div>

          {/* Brand name */}
          <span className="text-2xl font-extrabold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Setu
          </span>

          {/* Loading indicator */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">Verifying authorization request…</p>
            {/* Indeterminate loading bar */}
            <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary/80 oauth-loader" />
            </div>
            <style>{`
              .oauth-loader {
                animation: oauth-slide 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                transform-origin: left;
              }
              @keyframes oauth-slide {
                0% { left: -40%; right: 100%; }
                40% { left: 0%; right: 20%; }
                80% { left: 80%; right: 0%; }
                100% { left: 100%; right: -10%; }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state (missing params / invalid client) ─────────
  if (error && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold">Authorization Error</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/")}
          >
            Return to Setu
          </Button>
        </div>
      </div>
    );
  }

  // ── Consent screen ────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.05),transparent_40%)]" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6 animate-slide-up">

          {/* Header with Setu branding */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary p-2.5 overflow-hidden shadow-lg shadow-primary/20">
                <Image src={setuLogo} alt="Setu logo" width={32} height={32} className="object-contain" />
              </div>
              <span className="text-3xl font-extrabold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                Setu
              </span>
            </div>
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>

          {/* Main card */}
          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 overflow-hidden">

            {/* Card header */}
            <div className="px-6 pt-6 pb-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-medium">
                <Shield className="h-3.5 w-3.5" />
                Authorization Request
              </div>

              <h1 className="text-xl font-bold text-foreground leading-tight">
                <span className="text-primary">{clientName || "An application"}</span>{" "}
                wants to access your Setu account
              </h1>

              {user && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <LogIn className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Permissions list */}
            <div className="px-6 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">
                This will allow the application to:
              </p>
              <div className="space-y-1.5">
                {displayScopes.map((s, i) => {
                  const info = SCOPE_GROUPS[s];
                  return (
                    <div
                      key={s}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{info?.label || s}</p>
                        {info?.description && (
                          <p className="text-xs text-muted-foreground">{info.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {requestedScopes.length > 5 && (
                  <button
                    onClick={() => setShowAllScopes(!showAllScopes)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 transition-colors"
                  >
                    {showAllScopes ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show {requestedScopes.length - 5} more permissions
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mx-6 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="border-t border-border/50 bg-muted/20 px-6 py-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={handleDeny}
                  disabled={isAuthorizing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Deny
                </Button>
                <Button
                  className="flex-1 h-11 font-semibold shadow-lg shadow-primary/20"
                  onClick={handleAuthorize}
                  disabled={isAuthorizing}
                >
                  {isAuthorizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Authorize
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
                By authorizing, you allow this application to perform the listed actions
                on your behalf. You can revoke access at any time.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-3">
            {redirectUri && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                <span>Redirecting to: </span>
                <span className="font-mono text-foreground/70 max-w-[200px] truncate">
                  {new URL(redirectUri).hostname}
                </span>
              </div>
            )}
            <DevelopedBy />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-5 animate-fade-in">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-xl animate-pulse" />
              <div className="relative rounded-2xl bg-primary p-4 overflow-hidden shadow-xl shadow-primary/25">
                <Image src={setuLogo} alt="Setu logo" width={40} height={40} className="object-contain" />
              </div>
            </div>
            <span className="text-2xl font-extrabold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Setu
            </span>
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        </div>
      }
    >
      <AuthorizeContent />
    </Suspense>
  );
}
