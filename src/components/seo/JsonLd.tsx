/**
 * Reusable JSON-LD structured data components for SEO.
 *
 * These inject <script type="application/ld+json"> tags that help
 * Google understand the page content and display rich results.
 */

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Home page structured data: SoftwareApplication + WebSite + Person schemas.
 * Covers searches like "setu chat app", "setu theabhipatel", "setu abhishek patel".
 */
export function HomeJsonLd() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://setu.theabhipatel.com";

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Setu",
    alternateName: [
      "Setu Chat",
      "Setu Chat App",
      "Setu Chat Application",
      "Setu by TheAbhiPatel",
    ],
    description:
      "Modern real-time chat application with private and group messaging, MCP server, public REST API, OAuth 2.1, webhooks, and end-to-end security.",
    applicationCategory: "CommunicationApplication",
    operatingSystem: "Web, Windows, macOS, Linux",
    url: baseUrl,
    author: {
      "@type": "Person",
      name: "Abhishek Patel",
      alternateName: ["TheAbhiPatel", "theabhipatel", "Abhi Patel"],
      url: "https://www.theabhipatel.com/",
      sameAs: [
        "https://github.com/theabhipatel",
        "https://www.linkedin.com/in/theabhipatel",
      ],
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    screenshot: `${baseUrl}/og-image.png`,
    featureList: [
      "Real-time messaging",
      "Private and group chats",
      "MCP Server (Model Context Protocol)",
      "Public REST API",
      "OAuth 2.1 authentication",
      "Webhooks",
      "File sharing",
      "End-to-end security",
      "Desktop app (Tauri)",
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Setu Chat Application",
    alternateName: [
      "Setu",
      "Setu by TheAbhiPatel",
      "Setu by Abhishek Patel",
    ],
    url: baseUrl,
    creator: {
      "@type": "Person",
      name: "Abhishek Patel",
      alternateName: "TheAbhiPatel",
      url: "https://www.theabhipatel.com/",
    },
  };

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Abhishek Patel",
    alternateName: ["TheAbhiPatel", "theabhipatel", "Abhi Patel"],
    url: "https://www.theabhipatel.com/",
    sameAs: [
      "https://github.com/theabhipatel",
      "https://www.linkedin.com/in/theabhipatel",
      "https://github.com/theabhipatel/setu_chat_app",
    ],
    jobTitle: "Software Developer",
    knowsAbout: [
      "Full-Stack Development",
      "Chat Applications",
      "MCP Server",
      "Next.js",
      "TypeScript",
    ],
  };

  return (
    <>
      <JsonLd data={softwareApp} />
      <JsonLd data={website} />
      <JsonLd data={person} />
    </>
  );
}

/**
 * Documentation page structured data with breadcrumb navigation.
 */
export function DocsJsonLd({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://setu.theabhipatel.com";

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Setu",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Documentation",
        item: `${baseUrl}/docs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `${baseUrl}${path}`,
      },
    ],
  };

  const techArticle = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description: description,
    url: `${baseUrl}${path}`,
    author: {
      "@type": "Person",
      name: "Abhishek Patel",
      alternateName: "TheAbhiPatel",
      url: "https://www.theabhipatel.com/",
    },
    publisher: {
      "@type": "Organization",
      name: "Setu",
      url: baseUrl,
    },
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={techArticle} />
    </>
  );
}
