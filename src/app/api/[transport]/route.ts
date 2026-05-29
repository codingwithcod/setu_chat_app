import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  verifyApiKey,
  hasPermission,
  logApiUsage,
  type ApiKeyRecord,
  type PermissionScope,
} from "@/lib/api-key-auth";
import * as svc from "@/lib/services";
import type { ServiceResult } from "@/lib/services";

export const maxDuration = 60;

// ── MCP result helpers ──────────────────────────────────────
function mcpJson(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function mcpError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

// Shared per-tool boilerplate: read auth context, check scope, run the
// service fn, log usage once, and format the result as an MCP tool result.
async function handle(
  extra: { authInfo?: AuthInfo },
  scope: PermissionScope,
  endpoint: string,
  method: string,
  run: (ctx: svc.ServiceCtx) => Promise<ServiceResult<unknown>>
): Promise<CallToolResult> {
  const auth = extra.authInfo;
  const key = auth?.extra?.key as ApiKeyRecord | undefined;
  if (!key) return mcpError("UNAUTHORIZED: missing authentication context");

  if (!hasPermission(key.permissions, scope)) {
    return mcpError(`PERMISSION_DENIED: this key lacks the '${scope}' permission`);
  }

  const serviceClient = await createServiceClient();
  const result = await run({ serviceClient, userId: key.user_id });

  logApiUsage(serviceClient, {
    apiKeyId: key.id,
    userId: key.user_id,
    endpoint,
    method,
    statusCode: result.status,
  });

  return result.ok ? mcpJson(result.data) : mcpError(`${result.code}: ${result.message}`);
}

// ── MCP server: one tool per public API action ──────────────
const baseHandler = createMcpHandler(
  (server) => {
    // Messages
    server.tool(
      "send_message",
      "Send a message to a conversation the authenticated user is a member of.",
      {
        conversation_id: z.string().describe("ID of the conversation to send to"),
        content: z.string().describe("Message text"),
        message_type: z.string().optional().describe("Message type (default 'text')"),
        reply_to: z.string().optional().describe("ID of the message being replied to"),
      },
      (args, extra) =>
        handle(extra, "messages:send", "/api/v1/messages/send", "POST", (ctx) =>
          svc.sendMessage(ctx, args)
        )
    );

    server.tool(
      "list_messages",
      "List messages in a conversation, newest-first with cursor pagination.",
      {
        conversation_id: z.string(),
        before: z.string().optional().describe("ISO timestamp cursor; return messages older than this"),
        limit: z.number().optional().describe("Max messages to return (default 50, max 100)"),
      },
      (args, extra) =>
        handle(extra, "messages:read", `/api/v1/messages/list/${args.conversation_id}`, "GET", (ctx) =>
          svc.listMessages(ctx, args)
        )
    );

    server.tool(
      "edit_message",
      "Edit the text of a message the authenticated user sent.",
      { message_id: z.string(), content: z.string() },
      (args, extra) =>
        handle(extra, "messages:edit", `/api/v1/messages/${args.message_id}/edit`, "PATCH", (ctx) =>
          svc.editMessage(ctx, args)
        )
    );

    server.tool(
      "delete_message",
      "Soft-delete a message the authenticated user sent.",
      { message_id: z.string() },
      (args, extra) =>
        handle(extra, "messages:delete", `/api/v1/messages/${args.message_id}`, "DELETE", (ctx) =>
          svc.deleteMessage(ctx, args.message_id)
        )
    );

    // Conversations
    server.tool(
      "list_conversations",
      "List all conversations the authenticated user belongs to.",
      {},
      (_args, extra) =>
        handle(extra, "conversations:read", "/api/v1/conversations", "GET", (ctx) =>
          svc.listConversations(ctx)
        )
    );

    server.tool(
      "get_conversation",
      "Get a single conversation with its members.",
      { conversation_id: z.string() },
      (args, extra) =>
        handle(extra, "conversations:read", `/api/v1/conversations/${args.conversation_id}`, "GET", (ctx) =>
          svc.getConversation(ctx, args.conversation_id)
        )
    );

    server.tool(
      "create_conversation",
      "Create a private chat or group. For 'private', returns the existing chat if one exists.",
      {
        type: z.enum(["private", "group"]),
        member_ids: z.array(z.string()).describe("User IDs to add (exactly one for private)"),
        name: z.string().optional().describe("Group name (required for groups)"),
        description: z.string().optional(),
      },
      (args, extra) =>
        handle(extra, "conversations:create", "/api/v1/conversations", "POST", (ctx) =>
          svc.createConversation(ctx, args)
        )
    );

    // Groups & members
    server.tool(
      "add_members",
      "Add one or more members to a group conversation.",
      { group_id: z.string(), user_ids: z.array(z.string()) },
      (args, extra) =>
        handle(extra, "members:add", `/api/v1/groups/${args.group_id}/members`, "POST", (ctx) =>
          svc.addMembers(ctx, args.group_id, args.user_ids)
        )
    );

    server.tool(
      "list_members",
      "List the members of a group conversation.",
      { group_id: z.string() },
      (args, extra) =>
        handle(extra, "members:list", `/api/v1/groups/${args.group_id}/members`, "GET", (ctx) =>
          svc.listMembers(ctx, args.group_id)
        )
    );

    server.tool(
      "remove_member",
      "Remove a member from a group (self, or others if you are admin/owner).",
      { group_id: z.string(), user_id: z.string() },
      (args, extra) =>
        handle(extra, "members:remove", `/api/v1/groups/${args.group_id}/members`, "DELETE", (ctx) =>
          svc.removeMember(ctx, args.group_id, args.user_id)
        )
    );

    // Users
    server.tool(
      "search_users",
      "Search users by username or name (query must be at least 2 characters).",
      { q: z.string(), limit: z.number().optional().describe("Max results (default 20, max 50)") },
      (args, extra) =>
        handle(extra, "users:search", "/api/v1/users/search", "GET", (ctx) =>
          svc.searchUsers(ctx, args.q, args.limit)
        )
    );

    server.tool(
      "get_user_profile",
      "Get a user's public profile by ID.",
      { user_id: z.string() },
      (args, extra) =>
        handle(extra, "users:profile", `/api/v1/users/${args.user_id}`, "GET", (ctx) =>
          svc.getUserProfile(ctx, args.user_id)
        )
    );

    // Account
    server.tool(
      "get_account",
      "Get the authenticated user's account info.",
      {},
      (_args, extra) =>
        handle(extra, "account:read", "/api/v1/account", "GET", (ctx) => svc.getAccount(ctx))
    );

    // Files
    server.tool(
      "upload_file",
      "Upload a base64-encoded file (max 10MB) to a conversation and get its public URL.",
      {
        conversation_id: z.string(),
        file_name: z.string(),
        file_base64: z.string().describe("Base64-encoded file contents"),
        mime_type: z.string().optional(),
      },
      (args, extra) =>
        handle(extra, "files:upload", "/api/v1/files/upload", "POST", (ctx) => {
          const buffer = Buffer.from(args.file_base64, "base64");
          return svc.uploadFile(ctx, {
            data: buffer,
            fileName: args.file_name,
            contentType: args.mime_type,
            size: buffer.length,
            conversationId: args.conversation_id,
          });
        })
    );

    // Webhooks
    server.tool(
      "list_webhooks",
      "List the authenticated user's webhooks.",
      {},
      (_args, extra) =>
        handle(extra, "webhooks:read", "/api/v1/webhooks", "GET", (ctx) => svc.listWebhooks(ctx))
    );

    server.tool(
      "create_webhook",
      "Create a webhook subscription for conversation events.",
      {
        name: z.string(),
        url: z.string().describe("HTTPS endpoint that will receive event payloads"),
        events: z.array(z.string()).describe("Event types, e.g. ['message.received']"),
      },
      (args, extra) =>
        handle(extra, "webhooks:manage", "/api/v1/webhooks", "POST", (ctx) =>
          svc.createWebhook(ctx, args)
        )
    );

    server.tool(
      "update_webhook",
      "Update a webhook's name, url, events, or active state.",
      {
        webhook_id: z.string(),
        name: z.string().optional(),
        url: z.string().optional(),
        events: z.array(z.string()).optional(),
        is_active: z.boolean().optional(),
      },
      (args, extra) =>
        handle(extra, "webhooks:manage", `/api/v1/webhooks/${args.webhook_id}`, "PATCH", (ctx) =>
          svc.updateWebhook(ctx, args.webhook_id, args)
        )
    );

    server.tool(
      "delete_webhook",
      "Delete a webhook.",
      { webhook_id: z.string() },
      (args, extra) =>
        handle(extra, "webhooks:manage", `/api/v1/webhooks/${args.webhook_id}`, "DELETE", (ctx) =>
          svc.deleteWebhook(ctx, args.webhook_id)
        )
    );
  },
  { serverInfo: { name: "setu-chat", version: "1.0.0" } },
  { basePath: "/api", maxDuration: 60, disableSse: true }
);

// Authenticate every request with the existing Bearer API key. Runs once per
// request (= once per tool call in stateless Streamable HTTP), so rate limiting
// and usage counters match the REST API exactly — no double counting.
const verifyToken = async (req: Request, bearer?: string): Promise<AuthInfo | undefined> => {
  if (!bearer) return undefined;
  const serviceClient = await createServiceClient();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  const result = await verifyApiKey(bearer, serviceClient, ip);
  if (!result.ok) return undefined;

  const { key } = result;
  return {
    token: bearer,
    clientId: key.id,
    scopes: Object.keys(key.permissions).filter((s) => key.permissions[s]),
    extra: { key },
  };
};

const handler = withMcpAuth(baseHandler, verifyToken, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
