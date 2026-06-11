import type { Metadata } from "next";
import { DocsJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Setu Public API Documentation | REST API Reference",
  description:
    "Complete REST API documentation for Setu chat application by TheAbhiPatel. Send messages, manage conversations, groups, webhooks and more. Setu API docs with authentication, rate limits, and code examples.",
  keywords: [
    "setu api",
    "setu api docs",
    "setu api documentation",
    "setu rest api",
    "setu public api",
    "setu chat api",
    "setu developer docs",
    "theabhipatel api",
    "chat api documentation",
    "messaging api",
  ],
  openGraph: {
    title: "Setu Public API Documentation | REST API Reference",
    description:
      "Complete REST API docs for Setu chat application. Authentication, messages, conversations, groups, files, webhooks, and error codes.",
  },
  alternates: {
    canonical: "/docs/public-api",
  },
};

export default function PublicApiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DocsJsonLd
        title="Setu Public API Documentation"
        description="Complete REST API documentation for Setu chat application. Send messages, manage conversations, groups, webhooks and more."
        path="/docs/public-api"
      />
      {children}
    </>
  );
}
