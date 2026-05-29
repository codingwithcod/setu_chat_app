import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  authenticateApiKey,
  hasPermission,
  apiSuccess,
  apiError,
  logApiUsage,
} from "@/lib/api-key-auth";
import { uploadFile } from "@/lib/services";

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

  const result = await uploadFile(
    { serviceClient, userId: key.user_id },
    {
      data: file,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      conversationId: conversationId || "",
    }
  );

  logApiUsage(serviceClient, { apiKeyId: key.id, userId: key.user_id, endpoint: "/api/v1/files/upload", method: "POST", statusCode: result.status, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") || undefined, responseTimeMs: Date.now() - startTime });

  return result.ok
    ? apiSuccess(result.data, rateLimit, result.status)
    : apiError(result.code, result.message, result.status, rateLimit);
}
