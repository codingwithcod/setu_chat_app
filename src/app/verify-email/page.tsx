"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  Mail,
} from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "resend">(
    token ? "loading" : "resend"
  );
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      const res = await fetch(`/api/auth/verify-email?token=${token}`);
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error);
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  const resendVerification = async () => {
    if (!email) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setStatus("success");
      } else {
        setMessage(data.error);
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    }
    setResending(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="rounded-xl bg-primary p-2.5">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-3xl font-extrabold gradient-text">Setu</span>
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Verifying your email...</h2>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">
              {message || "Email Verified!"}
            </h2>
            <p className="text-muted-foreground">
              Your account is ready. You can now log in.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">Verification Failed</h2>
            <p className="text-muted-foreground">{message}</p>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/login">Back to Login</Link>
              </Button>
              <Button
                onClick={() => setStatus("resend")}
                className="flex-1"
              >
                Resend Email
              </Button>
            </div>
          </div>
        )}

        {status === "resend" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold">Resend Verification</h2>
            <p className="text-muted-foreground">
              Enter your email to receive a new verification link.
            </p>
            <div className="space-y-3 text-left">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
            <Button
              onClick={resendVerification}
              disabled={resending || !email}
              className="w-full"
            >
              {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Verification Email
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
