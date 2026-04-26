"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import {
  Shield,
  Loader2,
  Copy,
  Check,
  Download,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type SetupStep = "qr" | "code1" | "code2" | "backup" | "done";

interface TotpSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TotpSetupDialog({ open, onOpenChange }: TotpSetupDialogProps) {
  const { updateUser } = useAuthStore();
  const [step, setStep] = useState<SetupStep>("qr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup data
  const [setupId, setSetupId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Code inputs
  const [code, setCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Copy state
  const [secretCopied, setSecretCopied] = useState(false);
  const [backupCopied, setBackupCopied] = useState(false);

  // Initialize setup when dialog opens
  useEffect(() => {
    if (open) {
      initSetup();
    } else {
      // Reset state when dialog closes
      setStep("qr");
      setError("");
      setCode("");
      setSetupId("");
      setQrCodeUrl("");
      setSecret("");
      setBackupCodes([]);
      setSecretCopied(false);
      setBackupCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const initSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start 2FA setup");
        return;
      }

      setSetupId(data.setupId);
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setStep("qr");
    } catch {
      setError("Failed to start 2FA setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste - distribute digits across inputs
      const digits = value.replace(/\D/g, "").slice(0, 6);
      const newCode = digits.padEnd(6, " ").split("");
      setCode(digits);

      newCode.forEach((digit, i) => {
        if (inputRefs.current[i]) {
          inputRefs.current[i]!.value = digit.trim();
        }
      });

      // Focus the next empty input or the last one
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
      if (e.key === "Backspace" && !inputRefs.current[index]?.value && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    []
  );

  const resetCodeInputs = () => {
    setCode("");
    inputRefs.current.forEach((ref) => {
      if (ref) ref.value = "";
    });
    inputRefs.current[0]?.focus();
  };

  const verifyFirstCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/totp/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }

      resetCodeInputs();
      setStep("code2");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifySecondCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/totp/confirm-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }

      setBackupCodes(data.backupCodes || []);
      updateUser({ totp_enabled: true, totp_verified_at: new Date().toISOString() });
      setStep("backup");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "secret" | "backup") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "secret") {
        setSecretCopied(true);
        setTimeout(() => setSecretCopied(false), 2000);
      } else {
        setBackupCopied(true);
        setTimeout(() => setBackupCopied(false), 2000);
      }
    } catch {
      // Fallback for older browsers
    }
  };

  const downloadBackupCodes = () => {
    const content = [
      "Setu Chat — 2FA Backup Codes",
      "================================",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Each code can only be used once.",
      "Store these codes in a safe place.",
      "",
      ...backupCodes.map((code, i) => `${i + 1}. ${code}`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "setu-2fa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCodeInput = () => (
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
  );

  // Prevent closing during backup codes step
  const handleOpenChange = (newOpen: boolean) => {
    if (step === "backup" && !newOpen) {
      // Don't allow closing via overlay click during backup step
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 gap-3 sm:gap-4">
        {/* Step 1: QR Code */}
        {step === "qr" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Scan this QR code with your authenticator app (Google
                Authenticator, Authy, Microsoft Authenticator, etc.)
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="rounded-xl border-2 border-border bg-white p-2 sm:p-3">
                    {qrCodeUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodeUrl}
                        alt="TOTP QR Code"
                        width={224}
                        height={224}
                        className="rounded-lg w-[160px] h-[160px] sm:w-[224px] sm:h-[224px]"
                      />
                    )}
                  </div>
                </div>

                {/* Manual entry key */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Can&apos;t scan? Enter this key manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs font-mono tracking-wider text-center select-all break-all">
                      {secret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => copyToClipboard(secret.replace(/ /g, ""), "secret")}
                    >
                      {secretCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => {
                    setError("");
                    setStep("code1");
                  }}
                >
                  I&apos;ve scanned the QR code
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step 2: First Code */}
        {step === "code1" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Enter Verification Code
              </DialogTitle>
              <DialogDescription>
                Enter the 6-digit code shown in your authenticator app to verify
                the setup.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {renderCodeInput()}

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetCodeInputs();
                    setError("");
                    setStep("qr");
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={verifyFirstCode}
                  disabled={code.length !== 6 || loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Verify
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Second Code */}
        {step === "code2" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Enter Second Code
              </DialogTitle>
              <DialogDescription>
                Wait for a new code to appear in your authenticator app (every
                30 seconds), then enter it below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    The code must be <strong>different</strong> from the
                    previous one. Wait for your authenticator to generate a new
                    code.
                  </span>
                </p>
              </div>

              {renderCodeInput()}

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={verifySecondCode}
                disabled={code.length !== 6 || loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Confirm & Enable 2FA
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Backup Codes */}
        {step === "backup" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Two-Factor Authentication Enabled!
              </DialogTitle>
              <DialogDescription>
                Save these backup codes in a safe place. Each code can be used
                once if you lose access to your authenticator app.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>You won&apos;t be able to see these codes again.</strong>{" "}
                    Save them now!
                  </span>
                </p>
              </div>

              {/* Backup codes grid */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md bg-background/80 px-3 py-2 font-mono text-sm tracking-wider"
                    >
                      <span className="text-xs text-muted-foreground w-4">
                        {i + 1}.
                      </span>
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    copyToClipboard(backupCodes.join("\n"), "backup")
                  }
                >
                  {backupCopied ? (
                    <Check className="mr-2 h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {backupCopied ? "Copied!" : "Copy All"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={downloadBackupCodes}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setStep("done");
                  onOpenChange(false);
                }}
              >
                I&apos;ve saved my backup codes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
