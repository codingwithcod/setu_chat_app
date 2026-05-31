"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plug,
  Network,
  Key,
  Boxes,
  Terminal,
  Shield,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  FolderOpen,
  Users,
  Search,
  Upload,
  User,
  Webhook,
} from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: Network },
  { id: "connection", label: "Connection", icon: Plug },
  { id: "setup", label: "Client Setup", icon: Terminal },
  { id: "tools", label: "Tools Reference", icon: Boxes },
  { id: "examples", label: "Example Prompts", icon: Sparkles },
  { id: "rate-limits", label: "Rate Limits", icon: Shield },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertTriangle },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {copied ? <><Check className="h-3 w-3 text-emerald-500" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono leading-relaxed bg-card">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface ToolDef {
  name: string;
  scope: string;
  desc: string;
  params: string;
}

const TOOL_GROUPS: Array<{ group: string; icon: typeof MessageSquare; tools: ToolDef[] }> = [
  {
    group: "Messages",
    icon: MessageSquare,
    tools: [
      { name: "send_message", scope: "messages:send", desc: "Send a message to a conversation.", params: "conversation_id*, content*, message_type, reply_to" },
      { name: "list_messages", scope: "messages:read", desc: "List messages in a conversation (paginated, newest-first cursor).", params: "conversation_id*, before, limit" },
      { name: "edit_message", scope: "messages:edit", desc: "Edit a message you sent.", params: "message_id*, content*" },
      { name: "delete_message", scope: "messages:delete", desc: "Soft-delete a message you sent.", params: "message_id*" },
    ],
  },
  {
    group: "Conversations",
    icon: FolderOpen,
    tools: [
      { name: "list_conversations", scope: "conversations:read", desc: "List all conversations the key owner belongs to.", params: "—" },
      { name: "get_conversation", scope: "conversations:read", desc: "Get a single conversation with its members.", params: "conversation_id*" },
      { name: "create_conversation", scope: "conversations:create", desc: "Create a private chat or group. Returns existing private chat if one exists.", params: "type*, member_ids*, name, description" },
    ],
  },
  {
    group: "Groups & Members",
    icon: Users,
    tools: [
      { name: "add_members", scope: "members:add", desc: "Add members to a group.", params: "group_id*, user_ids*" },
      { name: "list_members", scope: "members:list", desc: "List a group's members.", params: "group_id*" },
      { name: "remove_member", scope: "members:remove", desc: "Remove a member (self, or others if admin/owner).", params: "group_id*, user_id*" },
    ],
  },
  {
    group: "Users",
    icon: Search,
    tools: [
      { name: "search_users", scope: "users:search", desc: "Search users by name or username (min 2 chars).", params: "q*, limit" },
      { name: "get_user_profile", scope: "users:profile", desc: "Get a user's public profile.", params: "user_id*" },
    ],
  },
  {
    group: "Files",
    icon: Upload,
    tools: [
      { name: "upload_file", scope: "files:upload", desc: "Upload a file (base64) to a conversation. Max 10MB.", params: "conversation_id*, file_name*, file_base64*, mime_type" },
    ],
  },
  {
    group: "Account",
    icon: User,
    tools: [
      { name: "get_account", scope: "account:read", desc: "Get the authenticated user's account info.", params: "—" },
    ],
  },
  {
    group: "Webhooks",
    icon: Webhook,
    tools: [
      { name: "list_webhooks", scope: "webhooks:read", desc: "List your webhooks.", params: "—" },
      { name: "create_webhook", scope: "webhooks:manage", desc: "Create a webhook subscription.", params: "name*, url*, events*" },
      { name: "update_webhook", scope: "webhooks:manage", desc: "Update a webhook.", params: "webhook_id*, name, url, events, is_active" },
      { name: "delete_webhook", scope: "webhooks:manage", desc: "Delete a webhook.", params: "webhook_id*" },
    ],
  },
];

export default function McpPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const mcpUrl = `${baseUrl}/api/mcp`;

  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      {
        root: document.querySelector("[data-mcp-scroll]"),
        rootMargin: "-80px 0px -60% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border px-3 py-6 overflow-y-auto flex-shrink-0 sticky top-0 h-screen">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-3">
          MCP Server
        </h3>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" data-mcp-scroll>
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-12">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Plug className="h-6 w-6 text-primary" />
              MCP Server
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect any AI agent or app to Setu over the Model Context Protocol — same capabilities as the REST API, exposed as tools.
            </p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">v1.0.0</span>
              <span className="text-xs text-muted-foreground">Endpoint: <code className="text-primary font-mono">{mcpUrl}</code></span>
            </div>
          </div>

          {/* Overview */}
          <section id="overview" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" /> Overview
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The <strong className="text-foreground">Model Context Protocol (MCP)</strong> is an open standard that lets AI assistants
              (Claude Desktop, Cursor, Cline, custom agents, and more) call external tools. Setu hosts a remote MCP server, so any
              compatible client can send messages, manage conversations and groups, search users, upload files, and manage webhooks —
              all on behalf of the user that owns the API key.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Plug, title: "Hosted & remote", desc: "One URL. No install, no local process to run." },
                { icon: Key, title: "Your existing key", desc: "Reuses your tap_setu_ key, scopes, and rate limits." },
                { icon: Boxes, title: "Full API surface", desc: "Every public API action is available as a tool." },
              ].map((c) => (
                <div key={c.title} className="rounded-lg border border-border/50 bg-card p-3.5">
                  <c.icon className="h-4 w-4 text-primary mb-2" />
                  <p className="text-xs font-semibold">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
                Looking for raw HTTP endpoints instead? See the{" "}
                <Link href="/docs/public-api" className="text-primary hover:underline font-medium">REST API documentation</Link>.
              </p>
            </div>
          </section>

          {/* Connection */}
          <section id="connection" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" /> Connection
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <tbody>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30 w-32">Endpoint URL</td><td className="px-3 py-2 font-mono text-primary">{mcpUrl}</td></tr>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30">Transport</td><td className="px-3 py-2">Streamable HTTP</td></tr>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30">Auth</td><td className="px-3 py-2 font-mono">Authorization: Bearer &lt;your key&gt;</td></tr>
                  <tr><td className="px-3 py-2 font-medium bg-muted/30">Version</td><td className="px-3 py-2">1.0.0 (reported in <code className="font-mono text-primary">serverInfo</code> during initialize)</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Authentication reuses your existing API key. Create one in{" "}
              <Link href="/developer/keys" className="text-primary hover:underline font-medium">API Keys</Link>{" "}
              and grant it the scopes you want the agent to use — each tool requires the same scope as its REST counterpart.
            </p>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                Treat the key like a password. Store it in your client&apos;s config/secret store — never commit it to a repo.
              </p>
            </div>
          </section>

          {/* Client Setup */}
          <section id="setup" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" /> Client Setup
            </h2>

            <h3 className="text-sm font-semibold">Clients with native remote MCP support (e.g. Cursor)</h3>
            <p className="text-xs text-muted-foreground">Point the client at the URL and attach the auth header:</p>
            <CodeBlock language="json" code={`{
  "mcpServers": {
    "setu-chat": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer tap_setu_YOUR_KEY_HERE"
      }
    }
  }
}`} />

            <h3 className="text-sm font-semibold mt-4">Claude Desktop / stdio-only clients</h3>
            <p className="text-xs text-muted-foreground">
              Use the <code className="text-primary font-mono bg-muted px-1 rounded">mcp-remote</code> bridge to connect a stdio client to the remote server with headers:
            </p>
            <CodeBlock language="json" code={`{
  "mcpServers": {
    "setu-chat": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "${mcpUrl}",
        "--header", "Authorization: Bearer tap_setu_YOUR_KEY_HERE"
      ]
    }
  }
}`} />

            <h3 className="text-sm font-semibold mt-4">Test it with the MCP Inspector</h3>
            <CodeBlock code={`npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP
# URL: ${mcpUrl}
# Header: Authorization: Bearer tap_setu_YOUR_KEY_HERE`} />
          </section>

          {/* Tools Reference */}
          <section id="tools" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" /> Tools Reference
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Parameters marked <code className="text-primary font-mono">*</code> are required. Each tool requires the listed
              permission scope on your API key; calling a tool without its scope returns a <code className="font-mono">PERMISSION_DENIED</code> error.
            </p>
            {TOOL_GROUPS.map((g) => (
              <div key={g.group} className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2 mt-4">
                  <g.icon className="h-4 w-4 text-primary" /> {g.group}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground">
                        <th className="text-left px-3 py-2 font-medium">Tool</th>
                        <th className="text-left px-3 py-2 font-medium">Scope</th>
                        <th className="text-left px-3 py-2 font-medium">Parameters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.tools.map((t) => (
                        <tr key={t.name} className="border-t border-border/50 align-top">
                          <td className="px-3 py-2">
                            <code className="font-mono text-primary">{t.name}</code>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">{t.desc}</p>
                          </td>
                          <td className="px-3 py-2"><code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">{t.scope}</code></td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{t.params}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          {/* Example Prompts */}
          <section id="examples" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Example Prompts
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once connected, you can drive Setu in natural language. The agent picks the right tools automatically:
            </p>
            <div className="space-y-2">
              {[
                "“Search for the user @nidhi and send her a message saying the report is ready.”",
                "“Create a group called ‘Launch Team’ with alice, bob and carol, then post the kickoff agenda.”",
                "“Summarize the last 50 messages in my conversation with the design team.”",
                "“Set up a webhook to my server for message.received events.”",
              ].map((p, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-card px-3 py-2.5 text-xs text-muted-foreground italic">
                  {p}
                </div>
              ))}
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Rate Limits
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MCP tool calls share the exact same rate limit and usage tracking as the REST API — each tool call counts as a single
              request against your key&apos;s per-minute limit. See the{" "}
              <Link href="/docs/public-api" className="text-primary hover:underline font-medium">REST docs</Link> for per-plan limits, and{" "}
              <Link href="/developer/usage" className="text-primary hover:underline font-medium">Usage &amp; Analytics</Link> to monitor consumption.
            </p>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" /> Troubleshooting
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Symptom</th>
                    <th className="text-left px-3 py-2 font-medium">Cause &amp; Fix</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/50"><td className="px-3 py-2">401 / connection rejected</td><td className="px-3 py-2 text-muted-foreground">Missing or invalid key. Ensure the <code className="font-mono">Authorization: Bearer tap_setu_…</code> header is set and the key is active.</td></tr>
                  <tr className="border-t border-border/50"><td className="px-3 py-2"><code className="font-mono">PERMISSION_DENIED</code> from a tool</td><td className="px-3 py-2 text-muted-foreground">The key lacks that tool&apos;s scope. Add the scope in <Link href="/developer/keys" className="text-primary hover:underline">API Keys</Link>.</td></tr>
                  <tr className="border-t border-border/50"><td className="px-3 py-2"><code className="font-mono">RATE_LIMIT_EXCEEDED</code></td><td className="px-3 py-2 text-muted-foreground">Too many calls per minute. Slow down or upgrade your plan.</td></tr>
                  <tr className="border-t border-border/50"><td className="px-3 py-2">Tools not appearing</td><td className="px-3 py-2 text-muted-foreground">Confirm the transport is &ldquo;Streamable HTTP&rdquo; and the URL is exactly <code className="font-mono">{mcpUrl}</code>.</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
