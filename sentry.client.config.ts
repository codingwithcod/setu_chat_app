import * as Sentry from "@sentry/nextjs";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseIntegration } from "@supabase/sentry-js-integration";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),

    // Don't double-count Supabase REST calls: supabaseIntegration already
    // emits a `db` span, so skip the browser fetch span for /rest URLs.
    Sentry.browserTracingIntegration({
      shouldCreateSpanForRequest: (url) =>
        !url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest`),
    }),
  ],

  tracesSampleRate: 1.0,

  // Optional: session replay to watch slow interactions on the client.
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,

  environment: process.env.NODE_ENV,
});
