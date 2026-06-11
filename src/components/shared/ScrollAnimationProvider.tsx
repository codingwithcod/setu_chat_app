"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";

/**
 * Client-side wrapper that enables scroll-based animations on the page.
 * Extracted from the home page to allow the page itself to be a
 * Server Component for better SEO (server-rendered HTML).
 */
export default function ScrollAnimationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useScrollAnimation();
  return <>{children}</>;
}
