"use client";

import { useState } from "react";
import {
  BookOpen,
  Key,
  MessageSquare,
  Users,
  Upload,
  Webhook,
  Shield,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  Search,
  User,
  FolderOpen,
} from "lucide-react";

const SECTIONS = [
  { id: "getting-started", label: "Getting Started", icon: BookOpen },
  { id: "authentication", label: "Authentication", icon: Key },
  { id: "rate-limits", label: "Rate Limits", icon: Shield },
  { id: "messages", label: "Messages API", icon: MessageSquare },
  { id: "conversations", label: "Conversations API", icon: FolderOpen },
  { id: "groups", label: "Groups API", icon: Users },
  { id: "users", label: "Users API", icon: Search },
  { id: "files", label: "Files API", icon: Upload },
  { id: "account", label: "Account API", icon: User },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "errors", label: "Error Codes", icon: AlertTriangle },
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

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-500",
    POST: "bg-blue-500/10 text-blue-500",
    PATCH: "bg-amber-500/10 text-amber-500",
    DELETE: "bg-red-500/10 text-red-500",
  };
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border/50 bg-muted/20 my-2">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors[method] || "bg-muted text-muted-foreground"}`}>
        {method}
      </span>
      <code className="text-xs font-mono text-primary">{path}</code>
      <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">{desc}</span>
    </div>
  );
}

function ParamTable({ params }: { params: Array<{ name: string; type: string; required: boolean; desc: string }> }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="text-left px-3 py-2 font-medium">Parameter</th>
            <th className="text-left px-3 py-2 font-medium">Type</th>
            <th className="text-left px-3 py-2 font-medium">Required</th>
            <th className="text-left px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-t border-border/50">
              <td className="px-3 py-2 font-mono text-primary">{p.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.type}</td>
              <td className="px-3 py-2">
                {p.required ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">Required</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Optional</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-full">
      {/* Docs Sidebar — sticky navigation */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border px-3 py-6 overflow-y-auto flex-shrink-0 sticky top-0 h-screen">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-3">
          API Reference
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

      {/* Docs Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-12">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Setu Public API Documentation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Everything you need to integrate Setu&apos;s messaging into your applications.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">v1.0</span>
              <span className="text-xs text-muted-foreground">Base URL: <code className="text-primary font-mono">https://your-domain.com/api/v1</code></span>
            </div>
          </div>

          {/* Getting Started */}
          <section id="getting-started" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Getting Started
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Setu Public API allows you to send messages, manage conversations, and receive webhooks from your applications. Follow these steps:
            </p>
            <div className="space-y-2">
              {[
                { step: "1", title: "Create Account", desc: "Sign up at setu.app" },
                { step: "2", title: "Enable 2FA", desc: "Required before generating API keys" },
                { step: "3", title: "Generate API Key", desc: "Go to Developer Portal → API Keys → Create Key" },
                { step: "4", title: "Make API Calls", desc: "Use your key in the Authorization header" },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold mt-4">Response Format</h3>
            <p className="text-xs text-muted-foreground">All responses use a consistent JSON envelope:</p>
            <CodeBlock language="json" code={`// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123def456",
    "rate_limit": {
      "limit": 60,
      "remaining": 42,
      "reset": 60
    }
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid",
    "status": 401
  }
}`} />
          </section>

          {/* Authentication */}
          <section id="authentication" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Authentication
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All API requests require a valid API key passed in the <code className="text-primary font-mono bg-muted px-1 rounded">Authorization</code> header as a Bearer token.
            </p>
            <CodeBlock code={`curl -X GET https://your-domain.com/api/v1/conversations \\
  -H "Authorization: Bearer tap_setu_a3f8b1c9d4e7f2a0b5c8d1e4f7a0b3c6d9e2f5a8"`} />

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                Never expose your API key in client-side code or public repositories. Always use server-to-server requests.
              </p>
            </div>

            <h3 className="text-sm font-semibold">Key Format</h3>
            <p className="text-xs text-muted-foreground">
              All Setu API keys start with <code className="text-primary font-mono bg-muted px-1 rounded">tap_setu_</code> followed by 64 hexadecimal characters.
            </p>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Rate Limits
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Rate limits depend on your plan. Every response includes rate limit headers:
            </p>
            <CodeBlock language="http" code={`X-RateLimit-Limit: 60       # Max requests per minute
X-RateLimit-Remaining: 42  # Remaining in current window
X-RateLimit-Reset: 60      # Seconds until window resets`} />

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2">Plan</th>
                    <th className="text-left px-3 py-2">Requests/min</th>
                    <th className="text-left px-3 py-2">Daily Limit</th>
                    <th className="text-left px-3 py-2">API Keys</th>
                    <th className="text-left px-3 py-2">Webhooks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/50"><td className="px-3 py-2 font-medium">Free</td><td className="px-3 py-2">60</td><td className="px-3 py-2">10,000</td><td className="px-3 py-2">3</td><td className="px-3 py-2">2</td></tr>
                  <tr className="border-t border-border/50"><td className="px-3 py-2 font-medium text-blue-500">Plus</td><td className="px-3 py-2">300</td><td className="px-3 py-2">100,000</td><td className="px-3 py-2">10</td><td className="px-3 py-2">10</td></tr>
                  <tr className="border-t border-border/50"><td className="px-3 py-2 font-medium text-amber-500">Pro</td><td className="px-3 py-2">1,000</td><td className="px-3 py-2">500,000</td><td className="px-3 py-2">25</td><td className="px-3 py-2">25</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Messages API */}
          <section id="messages" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Messages API
            </h2>

            <Endpoint method="POST" path="/v1/messages/send" desc="Send a message" />
            <ParamTable params={[
              { name: "conversation_id", type: "string (UUID)", required: true, desc: "Target conversation ID" },
              { name: "content", type: "string", required: true, desc: "Message text content" },
              { name: "message_type", type: "string", required: false, desc: "text (default), image, file" },
              { name: "reply_to", type: "string (UUID)", required: false, desc: "ID of message to reply to" },
            ]} />
            <CodeBlock code={`curl -X POST https://your-domain.com/api/v1/messages/send \\
  -H "Authorization: Bearer tap_setu_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
    "content": "Hello from the API!",
    "message_type": "text"
  }'`} />
            <CodeBlock language="json" code={`{
  "success": true,
  "data": {
    "id": "msg_uuid",
    "conversation_id": "550e8400-...",
    "sender_id": "user_uuid",
    "content": "Hello from the API!",
    "message_type": "text",
    "created_at": "2026-04-26T12:00:00Z"
  }
}`} />

            <Endpoint method="GET" path="/v1/messages/:conversation_id" desc="List messages" />
            <ParamTable params={[
              { name: "conversation_id", type: "string (UUID)", required: true, desc: "Conversation ID (URL param)" },
              { name: "limit", type: "integer", required: false, desc: "Items per page (default 50, max 100)" },
              { name: "before", type: "string (ISO)", required: false, desc: "Cursor: messages before this timestamp" },
            ]} />

            <Endpoint method="PATCH" path="/v1/messages/:id" desc="Edit a message" />
            <ParamTable params={[
              { name: "content", type: "string", required: true, desc: "Updated message text" },
            ]} />

            <Endpoint method="DELETE" path="/v1/messages/:id" desc="Soft-delete a message" />
          </section>

          {/* Conversations API */}
          <section id="conversations" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" /> Conversations API
            </h2>

            <Endpoint method="GET" path="/v1/conversations" desc="List all conversations" />
            <CodeBlock code={`curl https://your-domain.com/api/v1/conversations \\
  -H "Authorization: Bearer tap_setu_your_key_here"`} />

            <Endpoint method="POST" path="/v1/conversations" desc="Create a conversation" />
            <ParamTable params={[
              { name: "type", type: "string", required: true, desc: "'private' or 'group'" },
              { name: "member_ids", type: "string[]", required: true, desc: "Array of user UUIDs to add" },
              { name: "name", type: "string", required: false, desc: "Group name (required for groups)" },
              { name: "description", type: "string", required: false, desc: "Group description" },
            ]} />

            <Endpoint method="GET" path="/v1/conversations/:id" desc="Get conversation details" />
          </section>

          {/* Groups API */}
          <section id="groups" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Groups API
            </h2>

            <Endpoint method="POST" path="/v1/groups/:id/members" desc="Add members to group" />
            <ParamTable params={[
              { name: "user_ids", type: "string[]", required: true, desc: "Array of user UUIDs to add" },
            ]} />

            <Endpoint method="DELETE" path="/v1/groups/:id/members/:user_id" desc="Remove member" />
            <Endpoint method="GET" path="/v1/groups/:id/members" desc="List group members" />
          </section>

          {/* Users API */}
          <section id="users" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Users API
            </h2>

            <Endpoint method="GET" path="/v1/users/search?q=query" desc="Search users" />
            <ParamTable params={[
              { name: "q", type: "string", required: true, desc: "Search query (username or name)" },
              { name: "limit", type: "integer", required: false, desc: "Max results (default 20, max 50)" },
            ]} />
            <CodeBlock code={`curl "https://your-domain.com/api/v1/users/search?q=john" \\
  -H "Authorization: Bearer tap_setu_your_key_here"`} />

            <Endpoint method="GET" path="/v1/users/:id" desc="Get user profile" />
          </section>

          {/* Files API */}
          <section id="files" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Files API
            </h2>

            <Endpoint method="POST" path="/v1/files/upload" desc="Upload a file" />
            <p className="text-xs text-muted-foreground">
              Use <code className="text-primary font-mono bg-muted px-1 rounded">multipart/form-data</code> to upload files. Max size: 10MB.
            </p>
            <ParamTable params={[
              { name: "file", type: "File", required: true, desc: "The file to upload" },
              { name: "conversation_id", type: "string (UUID)", required: true, desc: "Target conversation" },
            ]} />
            <CodeBlock code={`curl -X POST https://your-domain.com/api/v1/files/upload \\
  -H "Authorization: Bearer tap_setu_your_key_here" \\
  -F "file=@photo.jpg" \\
  -F "conversation_id=550e8400-e29b-41d4-a716-446655440000"`} />
          </section>

          {/* Account API */}
          <section id="account" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Account API
            </h2>

            <Endpoint method="GET" path="/v1/account" desc="Get your account info" />
            <CodeBlock code={`curl https://your-domain.com/api/v1/account \\
  -H "Authorization: Bearer tap_setu_your_key_here"`} />
            <CodeBlock language="json" code={`{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "you@example.com",
    "username": "johndoe",
    "first_name": "John",
    "last_name": "Doe",
    "plan": "free",
    "created_at": "2026-01-15T08:00:00Z"
  }
}`} />
          </section>

          {/* Webhooks */}
          <section id="webhooks" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" /> Webhooks
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Webhooks push real-time events to your endpoint via HTTP POST. Configure them in the Developer Portal.
            </p>

            <h3 className="text-sm font-semibold">Available Events</h3>
            <div className="space-y-1.5">
              {[
                { event: "message.received", desc: "New message in your conversations" },
                { event: "message.updated", desc: "A message was edited" },
                { event: "message.deleted", desc: "A message was soft-deleted" },
                { event: "conversation.created", desc: "You were added to a new conversation" },
                { event: "member.joined", desc: "New member joined a group" },
                { event: "member.left", desc: "Member left or was removed" },
              ].map((ev) => (
                <div key={ev.event} className="flex items-center gap-3 px-3 py-2 rounded border border-border/50 bg-card">
                  <code className="text-xs font-mono text-primary">{ev.event}</code>
                  <span className="text-xs text-muted-foreground">{ev.desc}</span>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold mt-4">Payload Format</h3>
            <CodeBlock language="json" code={`{
  "event": "message.received",
  "timestamp": "2026-04-26T15:00:00Z",
  "data": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "sender_id": "uuid",
    "content_preview": "Hey, how are...",
    "message_type": "text",
    "created_at": "2026-04-26T15:00:00Z"
  }
}`} />

            <h3 className="text-sm font-semibold">Headers</h3>
            <CodeBlock language="http" code={`Content-Type: application/json
X-Setu-Signature: sha256=<HMAC-SHA256 of body using webhook secret>
X-Setu-Event: message.received
X-Setu-Delivery-Id: dlv_uuid_here
X-Setu-Timestamp: 1714150800`} />

            <h3 className="text-sm font-semibold">Signature Verification (Node.js)</h3>
            <CodeBlock language="javascript" code={`const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`} />
          </section>

          {/* Error Codes */}
          <section id="errors" className="scroll-mt-8 space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" /> Error Codes
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2">HTTP</th>
                    <th className="text-left px-3 py-2">Code</th>
                    <th className="text-left px-3 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { http: 400, code: "INVALID_REQUEST", desc: "Request body is malformed or missing required fields" },
                    { http: 401, code: "MISSING_API_KEY", desc: "No Authorization header provided" },
                    { http: 401, code: "INVALID_API_KEY", desc: "The API key is invalid or not found" },
                    { http: 403, code: "KEY_DISABLED", desc: "The API key has been deactivated" },
                    { http: 403, code: "KEY_EXPIRED", desc: "The API key has expired" },
                    { http: 403, code: "IP_NOT_ALLOWED", desc: "Your IP is not in the key's whitelist" },
                    { http: 403, code: "PERMISSION_DENIED", desc: "This key lacks the required permission scope" },
                    { http: 404, code: "NOT_FOUND", desc: "The requested resource was not found" },
                    { http: 429, code: "RATE_LIMIT_EXCEEDED", desc: "Too many requests — wait and retry" },
                    { http: 500, code: "INTERNAL_ERROR", desc: "Something went wrong on our end" },
                  ].map((err) => (
                    <tr key={err.code} className="border-t border-border/50">
                      <td className="px-3 py-2">
                        <span className={`font-mono ${err.http < 400 ? "text-emerald-500" : err.http < 500 ? "text-amber-500" : "text-red-500"}`}>
                          {err.http}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-primary">{err.code}</td>
                      <td className="px-3 py-2 text-muted-foreground">{err.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            <p>Setu Public API v1.0 — Questions? Contact support@setu.app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
