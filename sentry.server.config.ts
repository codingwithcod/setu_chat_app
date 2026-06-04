import * as Sentry from "@sentry/nextjs";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseIntegration } from "@supabase/sentry-js-integration";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    // Instruments every Supabase query/auth call as a `db`/`auth` span.
    // We pass the SupabaseClient *class* so it patches the prototype and
    // covers all per-request clients (createClient / createServiceClient).
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),

    // Avoid a duplicate `http.client` span for the same Supabase REST call
    // (the supabaseIntegration already creates a richer `db` span for it).
    Sentry.httpIntegration({
      ignoreOutgoingRequests: (url) =>
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest`),
    }),
  ],

  // Controlled via env so you can change it in prod without touching code.
  // Server-side: read at runtime → just change the env var + restart, no rebuild.
  // Defaults to 1.0 (capture everything) when unset, e.g. in local dev.
  tracesSampleRate: process.env.SENTRY_SERVER_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_SERVER_TRACES_SAMPLE_RATE)
    : 1.0,

  // Drop Sentry's own tunnel traffic so it doesn't eat your quota.
  // /monitoring is the tunnelRoute (set in next.config.mjs); the server
  // would otherwise trace each event upload as its own transaction.
  ignoreTransactions: ["POST /monitoring", "/monitoring"],

  environment: process.env.NODE_ENV,
});
