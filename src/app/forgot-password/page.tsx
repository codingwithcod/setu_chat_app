"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import setuLogo from "@/app/setu-white-tr.png";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

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
            Don&apos;t worry, it happens to the best of us.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Enter your email and we&apos;ll send you a link to reset your
            password. You&apos;ll be back in no time.
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

          {!sent ? (
            <>
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight">
                  Forgot your password?
                </h2>
                <p className="text-muted-foreground">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className="h-11 placeholder:text-muted-foreground/50"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Reset Link
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to login
                </Link>
              </p>
            </>
          ) : (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-500/10 p-5">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  Check your inbox
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We&apos;ve sent a password reset link to{" "}
                  <strong className="text-foreground">
                    {getValues("email")}
                  </strong>
                  . The link will expire in 10 minutes.
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => setSent(false)}
                >
                  Didn&apos;t receive it? Try again
                </Button>
                <Button asChild className="w-full h-11">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
