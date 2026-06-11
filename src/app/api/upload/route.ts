import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";
import { safeUploadContentType } from "@/lib/file-validation";

export async function POST(request: Request) {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = { id: auth.userId };

  const formData = await request.formData();
  const files = formData.getAll("file") as File[];
  const bucket = (formData.get("bucket") as string) || "chat-files";
  // For avatars: pass entityId (userId for profile, conversationId for group)
  const entityId = formData.get("entityId") as string | null;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const isAvatarBucket =
    bucket === "profile-avatars" || bucket === "group-avatars";

  // Avatar upload — single file only
  if (isAvatarBucket && entityId) {
    const file = files[0];
    const fileExt = file.name.split(".").pop() || "jpg";
    const filePath = `${entityId}/avatar.${fileExt}`;

    // Delete any existing files in this entity's folder first
    const { data: existingFiles } = await serviceClient.storage
      .from(bucket)
      .list(entityId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${entityId}/${f.name}`);
      await serviceClient.storage.from(bucket).remove(filesToDelete);
    }

    // Upload with upsert
    const { data, error } = await serviceClient.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "0",
        upsert: true,
      });

    if (error) {
      console.error(`[Upload] Failed to upload avatar to ${bucket}:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from(bucket).getPublicUrl(data.path);
    const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

    return NextResponse.json({
      data: {
        url: cacheBustedUrl,
        path: data.path,
        name: file.name,
        size: file.size,
      },
    });
  }

  // Regular chat file upload — supports multiple files
  const uploadedFiles = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { data, error } = await serviceClient.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        // Force code/text/html files to be stored as text/plain so the public
        // URL can never execute embedded scripts when opened in a browser.
        contentType: safeUploadContentType(file.name, file.type),
      });

    if (error) {
      console.error(`[Upload] Failed to upload to ${bucket}:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from(bucket).getPublicUrl(data.path);

    uploadedFiles.push({
      url: publicUrl,
      path: data.path,
      name: file.name,
      size: file.size,
      mime_type: file.type,
    });
  }

  // Return array for multi-file, maintain backward compat shape for single file
  if (uploadedFiles.length === 1) {
    return NextResponse.json({ data: uploadedFiles[0] });
  }

  return NextResponse.json({ data: uploadedFiles });
}
