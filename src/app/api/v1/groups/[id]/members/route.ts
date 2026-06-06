import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { addMembers, listMembers, removeMember } from "@/lib/services";

// POST /api/v1/groups/[id]/members — Add members to a group
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "members:add")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'members:add' permission", 403, rateLimit);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    const msg = "Invalid JSON in request body";
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/groups/${params.id}/members`, method: "POST", statusCode: 400, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: msg });
    return apiError("INVALID_JSON", msg, 400, rateLimit);
  }

  const result = await addMembers({ serviceClient, userId: key.user_id }, params.id, body.user_ids);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/groups/${params.id}/members`, method: "POST", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}

// GET /api/v1/groups/[id]/members — List group members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "members:list")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'members:list' permission", 403, rateLimit);
  }

  const result = await listMembers({ serviceClient, userId: key.user_id }, params.id);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/groups/${params.id}/members`, method: "GET", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}

// DELETE /api/v1/groups/[id]/members — Remove a member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "members:remove")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'members:remove' permission", 403, rateLimit);
  }

  const userId = request.nextUrl.searchParams.get("user_id");
  const result = await removeMember({ serviceClient, userId: key.user_id }, params.id, userId || "");

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: `/api/v1/groups/${params.id}/members`, method: "DELETE", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime, errorMessage: result.ok ? undefined : `${result.code}: ${result.message}` });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
