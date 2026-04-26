"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Key,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  ShieldAlert,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Activity,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ApiKey } from "@/types";

const PERMISSION_PRESETS = [
  { id: "read_only", name: "Read Only", desc: "Read messages, conversations, and profiles" },
  { id: "send_messages", name: "Send Messages", desc: "Read + send messages, upload files" },
  { id: "full_chat", name: "Full Chat Access", desc: "All messaging and conversation operations" },
  { id: "admin", name: "Admin", desc: "Full access to all API features" },
];

const ALL_SCOPES = [
  { scope: "messages:send", label: "Send Messages", group: "Messages" },
  { scope: "messages:read", label: "Read Messages", group: "Messages" },
  { scope: "messages:edit", label: "Edit Messages", group: "Messages" },
  { scope: "messages:delete", label: "Delete Messages", group: "Messages" },
  { scope: "conversations:create", label: "Create Conversations", group: "Conversations" },
  { scope: "conversations:read", label: "Read Conversations", group: "Conversations" },
  { scope: "conversations:update", label: "Update Conversations", group: "Conversations" },
  { scope: "conversations:delete", label: "Delete Conversations", group: "Conversations" },
  { scope: "members:add", label: "Add Members", group: "Members" },
  { scope: "members:remove", label: "Remove Members", group: "Members" },
  { scope: "members:list", label: "List Members", group: "Members" },
  { scope: "users:search", label: "Search Users", group: "Users" },
  { scope: "users:profile", label: "View Profiles", group: "Users" },
  { scope: "files:upload", label: "Upload Files", group: "Files" },
  { scope: "files:read", label: "Read Files", group: "Files" },
  { scope: "webhooks:manage", label: "Manage Webhooks", group: "Webhooks" },
  { scope: "webhooks:read", label: "Read Webhooks", group: "Webhooks" },
  { scope: "account:read", label: "Read Account", group: "Account" },
];

export default function ApiKeysPage() {
  const { user } = useAuthStore();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Create form state
  const [keyName, setKeyName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("send_messages");
  const [useCustom, setUseCustom] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});
  const [expiresAt, setExpiresAt] = useState("");
  const [allowedIps, setAllowedIps] = useState("");

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/keys");
      const json = await res.json();
      if (json.data) setKeys(json.data);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    setCreating(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        name: keyName,
        ...(useCustom
          ? { permissions: customPermissions }
          : { preset: selectedPreset }),
      };

      if (expiresAt) body.expiresAt = expiresAt;
      if (allowedIps.trim()) {
        body.allowedIps = allowedIps.split(",").map((ip) => ip.trim());
      }

      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to create key");
        return;
      }

      setCreatedKey(json.data.raw_key);
      // Reset form
      setKeyName("");
      setSelectedPreset("send_messages");
      setUseCustom(false);
      setCustomPermissions({});
      setExpiresAt("");
      setAllowedIps("");
      fetchKeys();
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/developer/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchKeys();
    } catch (err) {
      console.error("Failed to toggle key:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this API key? This cannot be undone.")) return;
    try {
      await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
      fetchKeys();
    } catch (err) {
      console.error("Failed to delete key:", err);
    }
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const has2FA = user?.totp_enabled === true;

  const groupedScopes = ALL_SCOPES.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {} as Record<string, typeof ALL_SCOPES>);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage your API keys for the Setu Public API.
          </p>
        </div>
        {has2FA && (
          <Button
            onClick={() => { setShowCreate(true); setError(""); }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Key
          </Button>
        )}
      </div>

      {/* 2FA Warning */}
      {!has2FA && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Two-Factor Authentication Required</p>
            <p className="text-xs text-muted-foreground mt-1">
              You must enable 2FA in Settings before creating API keys. This protects your account and API access.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => window.location.href = "/settings"}
            >
              <Shield className="h-3.5 w-3.5" />
              Go to Settings
            </Button>
          </div>
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Key className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium">No API keys yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Create your first API key to start integrating Setu into your applications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`rounded-xl border bg-card p-4 transition-colors ${
                key.is_active ? "border-border hover:border-primary/20" : "border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-sm font-semibold truncate">{key.name}</h3>
                    <Badge
                      variant={key.is_active ? "secondary" : "outline"}
                      className="text-[10px] px-1.5"
                    >
                      {key.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {key.expires_at && new Date(key.expires_at) < new Date() && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}••••••••</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {key.total_requests.toLocaleString()} requests
                    </span>
                    {key.last_used_at && (
                      <span>
                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                    {key.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(key.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {/* Permission tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(key.permissions)
                      .filter(([, v]) => v)
                      .slice(0, 5)
                      .map(([scope]) => (
                        <span
                          key={scope}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/70 border border-primary/10"
                        >
                          {scope}
                        </span>
                      ))}
                    {Object.values(key.permissions).filter(Boolean).length > 5 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        +{Object.values(key.permissions).filter(Boolean).length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggle(key.id, key.is_active)}
                    title={key.is_active ? "Deactivate" : "Activate"}
                  >
                    {key.is_active ? (
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(key.id)}
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setCreatedKey(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {createdKey ? (
            /* Key Created Success */
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-500">
                  <Check className="h-5 w-5" />
                  API Key Created
                </DialogTitle>
                <DialogDescription>
                  Copy this key now. You won&apos;t be able to see it again.
                </DialogDescription>
              </DialogHeader>

              <div className="relative">
                <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all border border-border">
                  {createdKey}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-7 gap-1"
                  onClick={copyKey}
                >
                  {copied ? (
                    <><Check className="h-3 w-3 text-emerald-500" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy</>
                  )}
                </Button>
              </div>

              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Store this key securely. It will not be displayed again. If you lose it, you&apos;ll need to create a new one.
                </p>
              </div>

              <Button onClick={() => { setShowCreate(false); setCreatedKey(null); }} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            /* Create Key Form */
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Generate a new key to access the Setu Public API.
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="keyName" className="text-sm">Key Name</Label>
                <Input
                  id="keyName"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production Bot, Staging App"
                  maxLength={50}
                  className="h-9"
                />
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Permissions</Label>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setUseCustom(!useCustom)}
                  >
                    {useCustom ? "Use preset" : "Custom permissions"}
                  </button>
                </div>

                {useCustom ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(groupedScopes).map(([group, scopes]) => (
                      <div key={group}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{group}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {scopes.map((s) => (
                            <label
                              key={s.scope}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={customPermissions[s.scope] || false}
                                onChange={(e) =>
                                  setCustomPermissions((prev) => ({
                                    ...prev,
                                    [s.scope]: e.target.checked,
                                  }))
                                }
                                className="rounded border-border"
                              />
                              <span className="text-xs">{s.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {PERMISSION_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPreset(p.id)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedPreset === p.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/20"
                        }`}
                      >
                        <p className="text-xs font-semibold">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional: Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt" className="text-sm">
                  Expiration <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Optional: IP Whitelist */}
              <div className="space-y-2">
                <Label htmlFor="allowedIps" className="text-sm">
                  IP Whitelist <span className="text-muted-foreground">(optional, comma-separated)</span>
                </Label>
                <Input
                  id="allowedIps"
                  value={allowedIps}
                  onChange={(e) => setAllowedIps(e.target.value)}
                  placeholder="e.g. 203.0.113.0, 198.51.100.0"
                  className="h-9"
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating || !keyName.trim()}
                className="w-full"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate API Key
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
