import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { listConversations, createConversation } from "@/lib/services";

// GET /api/v1/conversations — List all conversations for the API key owner
export async function GET(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "conversations:read")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'conversations:read' permission", 403, rateLimit);
  }

  const result = await listConversations({ serviceClient, userId: key.user_id });

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/conversations", method: "GET", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}

// POST /api/v1/conversations — Create a new conversation
export async function POST(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "conversations:create")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'conversations:create' permission", 403, rateLimit);
  }

  const body = await request.json();
  const result = await createConversation({ serviceClient, userId: key.user_id }, body);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/conversations", method: "POST", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
