import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";

// POST /api/v1/files/upload — Upload a file via multipart/form-data
export async function POST(request: NextRequest) {
  const serviceClient = await createServiceClient();
  const startTime = Date.now();

  const authResult = await authenticateApiKey(request, serviceClient);
  if (authResult instanceof Response) return authResult;
  const { key, rateLimit } = authResult;

  if (!hasPermission(key.permissions, "files:upload")) {
    return apiError("PERMISSION_DENIED", "This key lacks the 'files:upload' permission", 403, rateLimit);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("INVALID_REQUEST", "Request must be multipart/form-data", 400, rateLimit);
  }

  const file = formData.get("file") as File | null;
  const conversationId = formData.get("conversation_id") as string | null;

  if (!file) {
    return apiError("INVALID_REQUEST", "file field is required", 400, rateLimit);
  }

  if (!conversationId) {
    return apiError("INVALID_REQUEST", "conversation_id field is required", 400, rateLimit);
  }

  // Verify membership
  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", key.user_id)
    .single();

  if (!membership) {
    return apiError("PERMISSION_DENIED", "You are not a member of this conversation", 403, rateLimit);
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return apiError("INVALID_REQUEST", "File size exceeds 10MB limit", 400, rateLimit);
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${key.user_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from("chat-files")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/files/upload", method: "POST", statusCode: 500, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });
    return apiError("INTERNAL_ERROR", uploadError.message, 500, rateLimit);
  }

  const { data: { publicUrl } } = serviceClient.storage
    .from("chat-files")
    .getPublicUrl(uploadData.path);

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/files/upload", method: "POST", statusCode: 201, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  return apiSuccess({
    url: publicUrl,
    path: uploadData.path,
    name: file.name,
    size: file.size,
    mime_type: file.type,
  }, rateLimit, 201);
}
