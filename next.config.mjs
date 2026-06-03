import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Required on Next.js 14 so src/instrumentation.ts runs (stable in Next 15).
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Get these from your Sentry project: Settings → General.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Needs SENTRY_AUTH_TOKEN in the build env to upload source maps so
  // stack traces are readable. Safe to leave unset in local dev.
  silent: !process.env.CI,

  // Tunnels Sentry requests through your domain to dodge ad-blockers.
  tunnelRoute: "/monitoring",

  // Hide source maps from the public bundle after upload.
  hideSourceMaps: true,
  disableLogger: true,
});
