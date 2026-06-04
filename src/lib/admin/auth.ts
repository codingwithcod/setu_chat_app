/**
 * Admin authorization — the single source of truth for "is this request
 * allowed to touch admin features".
 *
 * Used in two flavours:
 *  - `getAdminContext()` for Server Components / the admin layout guard.
 *  - `requireAdmin()` for `/api/admin/*` route handlers (returns a 403
 *    NextResponse on failure so handlers can early-return it).
 *
 * Both verify the role SERVER-SIDE against the DB on every request. The
 * client-side role is only ever used to hide UI, never to authorize.
 */
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export interface AdminContext {
  userId: string;
  email: string;
  serviceClient: SupabaseClient;
}

/**
 * Resolve the current admin context, or `null` if the caller is not a
 * signed-in admin. Reads the role from the DB (not from a cookie/claim).
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const serviceClient = await createServiceClient();
  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "admin" || profile.is_banned) {
    return null;
  }

  return { userId: user.id, email: user.email ?? "", serviceClient };
}

/**
 * Guard for API route handlers. Returns the admin context on success, or a
 * ready-to-return JSON error `Response` on failure:
 *
 *   const gate = await requireAdmin();
 *   if (gate instanceof NextResponse) return gate;
 *   const { serviceClient } = gate;
 */
export async function requireAdmin(): Promise<AdminContext | NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json(
      { error: "Forbidden: admin access required" },
      { status: 403 }
    );
  }
  return ctx;
}
