import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware). Supabase integration isn't loaded here since the
// edge runtime can't patch the Node SupabaseClient; keep this minimal.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
