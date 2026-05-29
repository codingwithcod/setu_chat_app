import { ServiceCtx, ServiceResult, ok, err } from "./types";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadFileParams {
  // A Blob, File, or Buffer to upload (REST passes a multipart File; MCP passes a decoded Buffer/Blob).
  data: Blob | Buffer;
  fileName: string;
  contentType?: string;
  size: number;
  conversationId: string;
}

export async function uploadFile(
  { serviceClient, userId }: ServiceCtx,
  params: UploadFileParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data, fileName, contentType, size, conversationId } = params;

  if (!conversationId) {
    return err("INVALID_REQUEST", "conversation_id is required", 400);
  }
  if (!data || !fileName) {
    return err("INVALID_REQUEST", "file and file_name are required", 400);
  }

  const { data: membership } = await serviceClient
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    return err("PERMISSION_DENIED", "You are not a member of this conversation", 403);
  }

  if (size > MAX_FILE_BYTES) {
    return err("INVALID_REQUEST", "File size exceeds 10MB limit", 400);
  }

  const fileExt = fileName.split(".").pop();
  const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from("chat-files")
    .upload(storagePath, data, {
      cacheControl: "3600",
      upsert: false,
      ...(contentType ? { contentType } : {}),
    });

  if (uploadError) return err("INTERNAL_ERROR", uploadError.message, 500);

  const { data: { publicUrl } } = serviceClient.storage
    .from("chat-files")
    .getPublicUrl(uploadData.path);

  return ok(
    {
      url: publicUrl,
      path: uploadData.path,
      name: fileName,
      size,
      mime_type: contentType || null,
    },
    201
  );
}
