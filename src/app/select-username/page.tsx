"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usernameSchema, type UsernameInput } from "@/lib/validations";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, AtSign } from "lucide-react";

export default function SelectUsernamePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UsernameInput>({
    resolver: zodResolver(usernameSchema),
  });

  const username = watch("username");

  const checkAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value)
      .single();

    setAvailable(!data);
    setChecking(false);
  };

  const onSubmit = async (data: UsernameInput) => {
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired. Please log in again.");
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: data.username })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/chat");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-3 justify-center">
          <div className="rounded-xl bg-primary p-2.5">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-3xl font-extrabold gradient-text">Setu</span>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Choose your username</h2>
          <p className="text-muted-foreground">
            This is how others will find and mention you. Choose wisely!
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="your_username"
                {...register("username", {
                  onChange: (e) => {
                    const timer = setTimeout(
                      () => checkAvailability(e.target.value),
                      500
                    );
                    return () => clearTimeout(timer);
                  },
                })}
                className="h-12 pl-9 text-base"
              />
              {checking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {errors.username && (
              <p className="text-xs text-destructive">
                {errors.username.message}
              </p>
            )}
            {available === true && username && username.length >= 3 && (
              <p className="text-xs text-emerald-500">
                ✓ Username is available
              </p>
            )}
            {available === false && (
              <p className="text-xs text-destructive">
                ✗ Username is already taken
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={isSubmitting || available === false}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Continue to Chat
          </Button>
        </form>
      </div>
    </div>
  );
}
