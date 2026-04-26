"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Loader2,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";

export default function VerifyTotpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      if (e.key === "Enter") {
        e.preventDefault();
        handleVerify();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, loading]
  );

  const handleVerify = async () => {
    const codeToSend = useBackupCode ? backupCode.trim() : code;

    if (!useBackupCode && codeToSend.length !== 6) return;
    if (useBackupCode && !codeToSend) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToSend,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }

      // TOTP verified — redirect to chat
      router.push("/chat");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // Sign out and go back to login
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  };

  // Auto-submit when all 6 digits are entered
  const handleAutoSubmit = useCallback(
    (newCode: string) => {
      if (newCode.length === 6 && !loading) {
        // Slight delay to show the last digit
        setTimeout(() => {
          setCode(newCode);
        }, 100);
      }
    },
    [loading]
  );

  return (
    <div className="flex min-h-screen">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-primary/5 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.1),transparent_40%)]" />
        <div className="relative z-10 max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-3">
              <MessageSquare className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-4xl font-extrabold gradient-text">Setu</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            Verify your identity
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Your account is protected with two-factor authentication. Enter the
            code from your authenticator app to continue.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Two-factor protected
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Secure login
            </div>
          </div>
        </div>
      </div>

      {/* Right side — TOTP form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="rounded-xl bg-primary p-2.5">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-3xl font-extrabold gradient-text">Setu</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">
                Two-Factor Authentication
              </h2>
            </div>
            <p className="text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {!useBackupCode ? (
            <div className="space-y-4">
              {/* 6-digit code input */}
              <div className="flex justify-center gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="h-14 w-12 text-center text-xl font-mono font-semibold tracking-widest"
                    onChange={(e) => {
                      handleCodeChange(i, e.target.value);
                      // Check if we should auto-submit
                      const updatedCode = code.slice(0, i) + e.target.value.replace(/\D/g, "").slice(0, 1);
                      handleAutoSubmit(updatedCode);
                    }}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={handleVerify}
                disabled={code.length !== 6 || loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Verify
              </Button>

              <button
                type="button"
                className="text-sm text-primary hover:underline w-full text-center"
                onClick={() => setUseBackupCode(true)}
              >
                Use a backup code instead
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Backup Code</p>
                <Input
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && backupCode.trim()) {
                      e.preventDefault();
                      handleVerify();
                    }
                  }}
                  placeholder="XXXX-XXXX"
                  className="h-12 text-center text-lg font-mono tracking-wider uppercase"
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-11 text-base font-semibold"
                onClick={handleVerify}
                disabled={!backupCode.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Verify Backup Code
              </Button>

              <button
                type="button"
                className="text-sm text-primary hover:underline w-full text-center"
                onClick={() => {
                  setUseBackupCode(false);
                  setBackupCode("");
                  setError("");
                }}
              >
                Use authenticator code instead
              </button>
            </div>
          )}

          <button
            type="button"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
