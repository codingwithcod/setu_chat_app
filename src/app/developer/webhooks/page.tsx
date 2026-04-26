"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Webhook,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Clock,
  AlertTriangle,
  ExternalLink,
  Radio,
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
import type { Webhook as WebhookType } from "@/types";

const WEBHOOK_EVENTS = [
  { event: "message.received", label: "Message Received", desc: "New message in your conversations" },
  { event: "message.updated", label: "Message Updated", desc: "A message was edited" },
  { event: "message.deleted", label: "Message Deleted", desc: "A message was deleted" },
  { event: "conversation.created", label: "Conversation Created", desc: "Added to a new conversation" },
  { event: "member.joined", label: "Member Joined", desc: "New member in a group" },
  { event: "member.left", label: "Member Left", desc: "Member left or removed from group" },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Create form state
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/webhooks");
      const json = await res.json();
      if (json.data) setWebhooks(json.data);
    } catch (err) {
      console.error("Failed to fetch webhooks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const selectAllEvents = () => {
    if (selectedEvents.length === WEBHOOK_EVENTS.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(WEBHOOK_EVENTS.map((e) => e.event));
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: webhookName,
          url: webhookUrl,
          events: selectedEvents,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to create webhook");
        return;
      }

      setCreatedSecret(json.data.secret);
      setWebhookName("");
      setWebhookUrl("");
      setSelectedEvents([]);
      fetchWebhooks();
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/developer/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchWebhooks();
    } catch (err) {
      console.error("Failed to toggle webhook:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook? All delivery logs will also be removed.")) return;
    try {
      await fetch(`/api/developer/webhooks/${id}`, { method: "DELETE" });
      fetchWebhooks();
    } catch (err) {
      console.error("Failed to delete webhook:", err);
    }
  };

  const copySecret = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhooks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive real-time event notifications via HTTP callbacks.
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); setError(""); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Webhook className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium">No webhooks configured</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Add a webhook to receive real-time notifications when events happen in your conversations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`rounded-xl border bg-card p-4 transition-colors ${
                wh.is_active ? "border-border hover:border-primary/20" : "border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-sm font-semibold truncate">{wh.name}</h3>
                    <Badge
                      variant={wh.is_active ? "secondary" : "outline"}
                      className="text-[10px] px-1.5"
                    >
                      {wh.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {wh.failure_count > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {wh.failure_count} failures
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{wh.url}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {wh.events.map((event) => (
                      <span
                        key={event}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/5 text-violet-500/70 border border-violet-500/10 flex items-center gap-1"
                      >
                        <Radio className="h-2 w-2" />
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {new Date(wh.created_at).toLocaleDateString()}
                    </span>
                    {wh.last_triggered_at && (
                      <span>Last triggered {new Date(wh.last_triggered_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggle(wh.id, wh.is_active)}
                    title={wh.is_active ? "Deactivate" : "Activate"}
                  >
                    {wh.is_active ? (
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(wh.id)}
                    title="Delete webhook"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setCreatedSecret(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {createdSecret ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-500">
                  <Check className="h-5 w-5" />
                  Webhook Created
                </DialogTitle>
                <DialogDescription>
                  Save the signing secret — you&apos;ll need it to verify webhook payloads.
                </DialogDescription>
              </DialogHeader>

              <div className="relative">
                <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all border border-border">
                  {createdSecret}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-7 gap-1"
                  onClick={copySecret}
                >
                  {copiedSecret ? (
                    <><Check className="h-3 w-3 text-emerald-500" /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy</>
                  )}
                </Button>
              </div>

              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ This secret is used to verify webhook signatures. Store it securely.
                </p>
              </div>

              <Button onClick={() => { setShowCreate(false); setCreatedSecret(null); }} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle>Add Webhook</DialogTitle>
                <DialogDescription>
                  Configure an endpoint to receive event notifications.
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="whName" className="text-sm">Name</Label>
                <Input
                  id="whName"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  placeholder="e.g. Production Notifications"
                  maxLength={50}
                  className="h-9"
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="whUrl" className="text-sm">Endpoint URL</Label>
                <Input
                  id="whUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/api/webhook"
                  className="h-9"
                />
              </div>

              {/* Events */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Events</Label>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={selectAllEvents}
                  >
                    {selectedEvents.length === WEBHOOK_EVENTS.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label
                      key={ev.event}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedEvents.includes(ev.event)
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:border-primary/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.event)}
                        onChange={() => toggleEvent(ev.event)}
                        className="mt-0.5 rounded border-border"
                      />
                      <div>
                        <p className="text-xs font-medium">{ev.label}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating || !webhookName.trim() || !webhookUrl.trim() || selectedEvents.length === 0}
                className="w-full"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Webhook
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
