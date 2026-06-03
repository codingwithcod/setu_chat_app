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

  // 100% of transactions in dev so you see everything.
  // Lower this (e.g. 0.2) in production to control cost.
  tracesSampleRate: 1.0,

  environment: process.env.NODE_ENV,
});
