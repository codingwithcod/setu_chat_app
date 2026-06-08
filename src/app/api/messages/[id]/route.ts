import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

// Edit or delete a message
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const auth = await getAuthUser();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await serviceClient
    .from("messages")
    .update({
      content: body.content,
      is_edited: true,
    })
    .eq("id", params.id)
    .eq("sender_id", auth.userId)
    .select(
      `
      *,
      sender:profiles(id, username, first_name, last_name, avatar_url)
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// Soft delete a message
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const serviceClient = await createServiceClient();
  const auth = await getAuthUser();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await serviceClient
    .from("messages")
    .update({
      is_deleted: true,
      content: null,
    })
    .eq("id", params.id)
    .eq("sender_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Message deleted" });
}
