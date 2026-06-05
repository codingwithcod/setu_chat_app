"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Flag } from "lucide-react";

const REASONS: { key: string; label: string }[] = [
  { key: "spam", label: "Spam or scam" },
  { key: "harassment", label: "Harassment or bullying" },
  { key: "hate", label: "Hate speech" },
  { key: "violence", label: "Violence or threats" },
  { key: "sexual", label: "Sexual or explicit content" },
  { key: "other", label: "Something else" },
];

export function ReportMessageModal({
  messageId,
  open,
  onOpenChange,
}: {
  messageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setReason("");
    setDetails("");
    setSubmitting(false);
    setDone(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    const res = await fetch(`/api/messages/${messageId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details: details.trim() || undefined }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => handleClose(false), 1400);
    } else {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "Could not submit report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Report message
          </DialogTitle>
          <DialogDescription>
            Reports are sent to moderators. Your identity is not shown to the
            other person.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center text-sm font-medium text-green-600">
            Thanks — your report has been submitted.
          </div>
        ) : (
          <>
            <div className="space-y-1.5 py-1">
              {REASONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setReason(r.key)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    reason === r.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      reason === r.key ? "border-primary" : "border-muted-foreground"
                    }`}
                  >
                    {reason === r.key && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </span>
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add more context (optional)"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!reason || submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
