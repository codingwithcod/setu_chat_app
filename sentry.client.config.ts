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

  // Browser value must use NEXT_PUBLIC_ so it's available in the bundle.
  // Note: this one is inlined at BUILD time, so changing it in prod needs a
  // rebuild (no code change). The server rate above updates with just a restart.
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
    : 1.0,

  // Optional: session replay to watch slow interactions on the client.
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,

  environment: process.env.NODE_ENV,
});
