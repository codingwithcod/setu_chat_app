import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // Mobile (React Native) clients carry the Supabase access token in the
  // Authorization header instead of cookies. Forwarding it as a global header
  // makes PostgREST/RLS evaluate queries as that user — the same identity the
  // web cookie session provides. Web requests have no Bearer header, so this is
  // a no-op for them.
  const authorization = (await headers()).get("authorization");
  const global =
    authorization?.startsWith("Bearer ")
      ? { global: { headers: { Authorization: authorization } } }
      : {};

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...global,
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignored in Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ignored in Server Component
          }
        },
      },
    }
  );
}

// The service-role client is stateless (no per-request cookies/auth), so we
// reuse a single instance across requests instead of building a new one on
// every call. Kept async so the ~125 existing `await createServiceClient()`
// call sites don't need to change.
let serviceClient: SupabaseClient | null = null;

export async function createServiceClient() {
  if (!serviceClient) {
    serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return serviceClient;
}
