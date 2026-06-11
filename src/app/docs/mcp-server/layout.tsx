import type { Metadata } from "next";
import { DocsJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Setu MCP Server Documentation | Model Context Protocol",
  description:
    "Connect AI agents to Setu via Model Context Protocol (MCP). Full MCP server docs by TheAbhiPatel with tools reference, OAuth 2.1 auth, client setup for Claude, Cursor, and more.",
  keywords: [
    "setu mcp",
    "setu mcp server",
    "setu mcp docs",
    "setu mcp documentation",
    "setu model context protocol",
    "mcp server documentation",
    "mcp chat server",
    "theabhipatel mcp",
    "ai agent chat",
    "claude mcp server",
    "cursor mcp server",
  ],
  openGraph: {
    title: "Setu MCP Server Documentation | Model Context Protocol",
    description:
      "Connect AI agents to Setu via MCP. Tools reference, OAuth 2.1, client setup for Claude Desktop, Cursor, and custom agents.",
  },
  alternates: {
    canonical: "/docs/mcp-server",
  },
};

export default function McpServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DocsJsonLd
        title="Setu MCP Server Documentation"
        description="Connect AI agents to Setu via Model Context Protocol (MCP). Full docs with tools reference, OAuth 2.1 auth, and client setup guides."
        path="/docs/mcp-server"
      />
      {children}
    </>
  );
}
