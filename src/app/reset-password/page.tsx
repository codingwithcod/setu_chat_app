"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  KeyRound,
} from "lucide-react";
import setuLogo from "@/app/setu-white-tr.png";

// Client-side schema (without token — token comes from URL)
const resetFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormInput = z.infer<typeof resetFormSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
  });

  const onSubmit = async (data: ResetFormInput) => {
    setServerError("");

    if (!token) {
      setServerError("Missing reset token. Please use the link from your email.");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setServerError(result.error);
        if (
          result.error.includes("expired") ||
          result.error.includes("Invalid")
        ) {
          setStatus("error");
        }
        return;
      }

      setStatus("success");
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  // No token in URL at all
  if (!token && status === "form") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex items-center gap-3 justify-center mb-8">
            <div className="rounded-xl bg-primary p-2 overflow-hidden">
              <Image src={setuLogo} alt="Setu logo" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-3xl font-extrabold gradient-text">Setu</span>
          </div>
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Invalid Reset Link</h2>
          <p className="text-muted-foreground">
            This link is missing the reset token. Please use the link from your
            email, or request a new one.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/login">Back to Login</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/forgot-password">Request New Link</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-primary/5 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.1),transparent_40%)]" />
        <div className="relative z-10 max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2.5 overflow-hidden">
              <Image src={setuLogo} alt="Setu logo" width={36} height={36} className="object-contain" />
            </div>
            <span className="text-4xl font-extrabold gradient-text">Setu</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            Almost there! Choose a new password.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Make sure it&apos;s at least 8 characters with an uppercase letter
            and a number. Keep your account secure.
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="rounded-xl bg-primary p-2 overflow-hidden">
              <Image src={setuLogo} alt="Setu logo" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-3xl font-extrabold gradient-text">Setu</span>
          </div>

          {status === "form" && (
            <>
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight">
                  Set a new password
                </h2>
                <p className="text-muted-foreground">
                  Enter your new password below. Make it strong and unique.
                </p>
              </div>

              {serverError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      {...register("password")}
                      className="h-11 pr-10 placeholder:text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      {...register("confirmPassword")}
                      className="h-11 pr-10 placeholder:text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-muted/50 border border-border/50 p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Password requirements:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• At least 8 characters</li>
                    <li>• At least one uppercase letter</li>
                    <li>• At least one number</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Reset Password
                </Button>
              </form>
            </>
          )}

          {status === "success" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-500/10 p-5">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Password reset successful!
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your password has been changed. You can now log in with your
                  new password.
                </p>
              </div>
              <Button asChild className="w-full h-11 text-base font-semibold">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-5">
                  <XCircle className="h-14 w-14 text-destructive" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Link expired or invalid
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {serverError ||
                    "This reset link is no longer valid. Please request a new one."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 h-11">
                  <Link href="/login">Back to Login</Link>
                </Button>
                <Button asChild className="flex-1 h-11">
                  <Link href="/forgot-password">Request New Link</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
