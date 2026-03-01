"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, AtSign } from "lucide-react";

const selectUsernameSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().max(50).optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
});

type SelectUsernameInput = z.infer<typeof selectUsernameSchema>;

export default function SelectUsernamePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SelectUsernameInput>({
    resolver: zodResolver(selectUsernameSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
    },
  });

  const username = watch("username");

  // Pre-fill first name and last name from Google OAuth if available
  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const meta = user.user_metadata || {};
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        // Try to get name from metadata (Google OAuth) or existing profile
        const fullName = meta.full_name || meta.name || "";
        const nameParts = fullName.trim().split(/\s+/);
        const googleFirst = meta.given_name || nameParts[0] || "";
        const googleLast =
          meta.family_name || nameParts.slice(1).join(" ") || "";

        const currentFirst = profile?.first_name || "";
        const emailPrefix = user.email?.split("@")[0] || "";

        // Only pre-fill if we have a real name (not just email prefix)
        const firstName =
          currentFirst && currentFirst !== emailPrefix
            ? currentFirst
            : googleFirst && googleFirst !== emailPrefix
            ? googleFirst
            : "";
        const lastName =
          profile?.last_name || googleLast || "";

        if (firstName) setValue("firstName", firstName);
        if (lastName) setValue("lastName", lastName);
      }
    };

    loadProfile();
  }, [setValue]);

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

  const onSubmit = async (data: SelectUsernameInput) => {
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
      .update({
        username: data.username,
        first_name: data.firstName,
        last_name: data.lastName || "",
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Create "Saved Messages" self conversation for this user
    try {
      await fetch("/api/conversations/self", { method: "POST" });
    } catch (e) {
      console.error("Failed to create self conversation:", e);
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
          <h2 className="text-2xl font-bold">Complete your profile</h2>
          <p className="text-muted-foreground">
            Tell us your name and choose a unique username.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Abhi"
                {...register("firstName")}
                className="h-12 text-base placeholder:text-muted-foreground/50"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Patel"
                {...register("lastName")}
                className="h-12 text-base placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
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
                className="h-12 pl-9 text-base placeholder:text-muted-foreground/50"
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
