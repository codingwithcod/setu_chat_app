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
  Lock,
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
  { id: "authentication", label: "Authentication", icon: Key },
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
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border px-3 py-6 overflow-y-auto flex-shrink-0">
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
                { icon: Key, title: "Key or OAuth", desc: "Static tap_setu_ key or OAuth 2.1 — same scopes & limits." },
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
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30">Auth</td><td className="px-3 py-2 font-mono">Authorization: Bearer &lt;token&gt;</td></tr>
                  <tr><td className="px-3 py-2 font-medium bg-muted/30">Version</td><td className="px-3 py-2">1.0.0 (reported in <code className="font-mono text-primary">serverInfo</code> during initialize)</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every request must carry a bearer token. Setu supports two ways to obtain one — a long-lived{" "}
              <strong className="text-foreground">static API key</strong> or an{" "}
              <strong className="text-foreground">OAuth 2.1</strong> access token. Both authenticate as a single Setu user and
              are constrained by the same permission scopes and rate limits. See{" "}
              <button onClick={() => scrollTo("authentication")} className="text-primary hover:underline font-medium">Authentication</button>{" "}
              to pick the right one.
            </p>
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                Treat tokens like passwords. Store them in your client&apos;s config/secret store — never commit them to a repo.
              </p>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Authentication
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The MCP server accepts two authentication methods. Both resolve to the same Setu user, the same{" "}
              <button onClick={() => scrollTo("tools")} className="text-primary hover:underline font-medium">permission scopes</button>,
              and the same rate limits — pick based on your client and who the agent acts for.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Method</th>
                    <th className="text-left px-3 py-2 font-medium">Best for</th>
                    <th className="text-left px-3 py-2 font-medium">How the agent gets access</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/50 align-top">
                    <td className="px-3 py-2"><strong className="text-foreground">Static Bearer Token</strong><p className="text-[11px] text-muted-foreground mt-0.5">API key</p></td>
                    <td className="px-3 py-2 text-muted-foreground">Personal automation and clients you control yourself.</td>
                    <td className="px-3 py-2 text-muted-foreground">You create a key in the dashboard and paste it into the client config.</td>
                  </tr>
                  <tr className="border-t border-border/50 align-top">
                    <td className="px-3 py-2"><strong className="text-foreground">OAuth 2.1</strong><p className="text-[11px] text-muted-foreground mt-0.5">authorization code + PKCE</p></td>
                    <td className="px-3 py-2 text-muted-foreground">Third-party agents and apps that act on behalf of <em>other</em> Setu users.</td>
                    <td className="px-3 py-2 text-muted-foreground">The user logs in and approves a consent screen; the client receives a scoped, expiring token automatically.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Option A — Static bearer token */}
            <h3 className="text-sm font-semibold flex items-center gap-2 mt-5">
              <Key className="h-4 w-4 text-primary" /> Option A — Static Bearer Token (API key)
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The simplest method. Create a key in{" "}
              <Link href="/developer/keys" className="text-primary hover:underline font-medium">API Keys</Link>, grant it the
              scopes you want the agent to use, and send it on every request:
            </p>
            <CodeBlock language="http" code={`Authorization: Bearer tap_setu_YOUR_KEY_HERE`} />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Keys start with <code className="text-primary font-mono">tap_setu_</code> and are long-lived (they only stop working
              if you disable them or set an expiry). The full key is shown once at creation — store it immediately. This is the
              right choice when you own both the agent and the account it acts as. See{" "}
              <button onClick={() => scrollTo("setup")} className="text-primary hover:underline font-medium">Client Setup</button>{" "}
              for ready-to-paste config.
            </p>

            {/* Option B — OAuth 2.1 */}
            <h3 className="text-sm font-semibold flex items-center gap-2 mt-5">
              <Lock className="h-4 w-4 text-primary" /> Option B — OAuth 2.1
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use OAuth when an agent or app needs to act on behalf of a user <em>without</em> ever handling a static key. The user
              authorizes through a Setu consent screen and your client receives a scoped, expiring access token. Setu implements
              OAuth 2.1 with mandatory <strong className="text-foreground">PKCE</strong> (<code className="font-mono">S256</code>) and{" "}
              <strong className="text-foreground">Dynamic Client Registration</strong>.
            </p>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
                Most MCP clients with built-in OAuth (e.g. Claude, Cursor) run this whole flow automatically — just point them at
                the MCP URL with <strong className="text-foreground">no auth header</strong> and follow the browser prompt. The
                steps below are what happens under the hood, and what to implement for a custom client.
              </p>
            </div>

            <p className="text-sm font-medium text-foreground mt-3">Discovery</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Clients discover the endpoints from the standard metadata document (RFC 8414):
            </p>
            <CodeBlock language="http" code={`GET ${baseUrl}/.well-known/oauth-authorization-server`} />
            <CodeBlock language="json" code={`{
  "issuer": "${baseUrl}",
  "authorization_endpoint": "${baseUrl}/oauth/authorize",
  "token_endpoint": "${baseUrl}/api/oauth/token",
  "registration_endpoint": "${baseUrl}/api/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none", "client_secret_post"]
}`} />

            <p className="text-sm font-medium text-foreground mt-3">Step 1 — Register a client (RFC 7591)</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Register once to get a <code className="text-primary font-mono">client_id</code>. No authentication is required.
              Redirect URIs must be <code className="font-mono">localhost</code> or HTTPS.
            </p>
            <CodeBlock language="bash" code={`curl -X POST ${baseUrl}/api/oauth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_name": "My MCP Client",
    "redirect_uris": ["http://localhost:9999/oauth/callback"],
    "grant_types": ["authorization_code"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "none",
    "scope": "messages:send messages:read conversations:read"
  }'`} />
            <CodeBlock language="json" code={`{
  "client_id": "setu_oac_...",
  "redirect_uris": ["http://localhost:9999/oauth/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}`} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Public clients use <code className="font-mono">token_endpoint_auth_method: &quot;none&quot;</code> (no secret).
              For a confidential client, use <code className="font-mono">client_secret_post</code> and a{" "}
              <code className="font-mono">client_secret</code> (prefix <code className="font-mono">setu_ocs_</code>) is returned.
            </p>

            <p className="text-sm font-medium text-foreground mt-3">Step 2 — Authorize (with PKCE)</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate a PKCE <code className="font-mono">code_verifier</code> and its <code className="font-mono">S256</code>{" "}
              <code className="font-mono">code_challenge</code>, then send the user to the authorization endpoint in a browser:
            </p>
            <CodeBlock language="http" code={`GET ${baseUrl}/oauth/authorize
  ?client_id=setu_oac_...
  &redirect_uri=http://localhost:9999/oauth/callback
  &response_type=code
  &scope=messages:send%20messages:read%20conversations:read
  &state=RANDOM_CSRF_VALUE
  &code_challenge=PKCE_S256_CHALLENGE
  &code_challenge_method=S256`} />
            <p className="text-sm text-muted-foreground leading-relaxed">
              The user signs in (if needed) and approves the requested scopes. Setu then redirects back to your{" "}
              <code className="font-mono">redirect_uri</code> with a one-time authorization code (the{" "}
              <code className="font-mono">state</code> is echoed back — verify it):
            </p>
            <CodeBlock language="http" code={`http://localhost:9999/oauth/callback?code=setu_ocd_...&state=RANDOM_CSRF_VALUE`} />

            <p className="text-sm font-medium text-foreground mt-3">Step 3 — Exchange the code for tokens</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              POST the code and the original <code className="font-mono">code_verifier</code> to the token endpoint (accepts JSON
              or <code className="font-mono">x-www-form-urlencoded</code>):
            </p>
            <CodeBlock language="bash" code={`curl -X POST ${baseUrl}/api/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "setu_ocd_...",
    "client_id": "setu_oac_...",
    "redirect_uri": "http://localhost:9999/oauth/callback",
    "code_verifier": "YOUR_PKCE_VERIFIER"
  }'`} />
            <CodeBlock language="json" code={`{
  "access_token": "setu_oat_...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "setu_ort_...",
  "scope": "messages:send messages:read conversations:read"
}`} />

            <p className="text-sm font-medium text-foreground mt-3">Step 4 — Call the MCP server</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Send the access token exactly like a static key — same header, same tools:
            </p>
            <CodeBlock language="http" code={`Authorization: Bearer setu_oat_...`} />

            <p className="text-sm font-medium text-foreground mt-3">Step 5 — Refresh when it expires</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Access tokens last <strong className="text-foreground">1 hour</strong>; refresh tokens last{" "}
              <strong className="text-foreground">30 days</strong>. When an access token expires, exchange the refresh token for a
              new pair (the old refresh token is rotated out):
            </p>
            <CodeBlock language="bash" code={`curl -X POST ${baseUrl}/api/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "setu_ort_...",
    "client_id": "setu_oac_..."
  }'`} />

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <tbody>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30 w-44">Discovery</td><td className="px-3 py-2 font-mono text-primary">/.well-known/oauth-authorization-server</td></tr>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30">Registration</td><td className="px-3 py-2 font-mono text-primary">/api/oauth/register</td></tr>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30">Authorization</td><td className="px-3 py-2 font-mono text-primary">/oauth/authorize</td></tr>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30">Token</td><td className="px-3 py-2 font-mono text-primary">/api/oauth/token</td></tr>
                  <tr className="border-b border-border/50"><td className="px-3 py-2 font-medium bg-muted/30">Access token TTL</td><td className="px-3 py-2">1 hour</td></tr>
                  <tr><td className="px-3 py-2 font-medium bg-muted/30">Refresh token TTL</td><td className="px-3 py-2">30 days (rotated on use)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Client Setup */}
          <section id="setup" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" /> Client Setup
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              The snippets below use a static API key. If your client supports OAuth, you can instead point it at the URL with{" "}
              <strong className="text-foreground">no header</strong> and it will run the{" "}
              <button onClick={() => scrollTo("authentication")} className="text-primary hover:underline font-medium">OAuth flow</button>{" "}
              for you in the browser:
            </p>
            <CodeBlock language="json" code={`{
  "mcpServers": {
    "setu-chat": {
      "url": "${mcpUrl}"
    }
  }
}`} />

            <h3 className="text-sm font-semibold mt-4">Clients with native remote MCP support (e.g. Cursor)</h3>
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
                  <tr className="border-t border-border/50"><td className="px-3 py-2">401 / connection rejected</td><td className="px-3 py-2 text-muted-foreground">Missing or invalid token. Ensure an <code className="font-mono">Authorization: Bearer</code> header is set with an active static key (<code className="font-mono">tap_setu_…</code>) or a valid OAuth access token (<code className="font-mono">setu_oat_…</code>).</td></tr>
                  <tr className="border-t border-border/50"><td className="px-3 py-2">OAuth token stopped working after ~1 hour</td><td className="px-3 py-2 text-muted-foreground">Access tokens expire after 1 hour. Use the <code className="font-mono">refresh_token</code> grant to get a new pair — see <button onClick={() => scrollTo("authentication")} className="text-primary hover:underline">Authentication</button>.</td></tr>
                  <tr className="border-t border-border/50"><td className="px-3 py-2"><code className="font-mono">PERMISSION_DENIED</code> from a tool</td><td className="px-3 py-2 text-muted-foreground">The token lacks that tool&apos;s scope. For a static key, add the scope in <Link href="/developer/keys" className="text-primary hover:underline">API Keys</Link>; for OAuth, request the scope during authorization.</td></tr>
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
