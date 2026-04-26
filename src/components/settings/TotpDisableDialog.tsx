"use client";

import { useState, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldOff, Loader2, AlertTriangle } from "lucide-react";

interface TotpDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TotpDisableDialog({
  open,
  onOpenChange,
}: TotpDisableDialogProps) {
  const { updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetState = () => {
    setLoading(false);
    setError("");
    setCode("");
    setBackupCode("");
    setUseBackupCode(false);
    inputRefs.current.forEach((ref) => {
      if (ref) ref.value = "";
    });
  };

  const handleCodeChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newCode = digits.padEnd(6, " ").split("");
      setCode(digits);

      newCode.forEach((digit, i) => {
        if (inputRefs.current[i]) {
          inputRefs.current[i]!.value = digit.trim();
        }
      });

      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, "");
    setCode((prev) => {
      const arr = prev.split("");
      arr[index] = digit;
      return arr.join("").replace(/ /g, "");
    });

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Backspace" &&
        !inputRefs.current[index]?.value &&
        index > 0
      ) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    []
  );

  const handleDisable = async () => {
    const codeToSend = useBackupCode ? backupCode.trim() : code;

    if (!useBackupCode && codeToSend.length !== 6) return;
    if (useBackupCode && !codeToSend) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToSend,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to disable 2FA");
        return;
      }

      updateUser({ totp_enabled: false, totp_verified_at: null });
      resetState();
      onOpenChange(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetState();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter your authenticator code or a backup code to confirm disabling
            2FA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Disabling 2FA will make your account less secure. You&apos;ll
                only need your password to sign in.
              </span>
            </p>
          </div>

          {!useBackupCode ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Authenticator Code</p>
                <div className="flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="h-12 w-11 text-center text-lg font-mono font-semibold tracking-widest"
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-primary hover:underline w-full text-center"
                onClick={() => setUseBackupCode(true)}
              >
                Use a backup code instead
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Backup Code</p>
                <Input
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  placeholder="XXXX-XXXX"
                  className="h-11 text-center font-mono tracking-wider uppercase"
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="text-xs text-primary hover:underline w-full text-center"
                onClick={() => {
                  setUseBackupCode(false);
                  setBackupCode("");
                }}
              >
                Use authenticator code instead
              </button>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDisable}
              disabled={
                loading ||
                (!useBackupCode && code.length !== 6) ||
                (useBackupCode && !backupCode.trim())
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
