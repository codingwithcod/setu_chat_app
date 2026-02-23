import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Edit or delete a message
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("messages")
    .update({
      content: body.content,
      is_edited: true,
    })
    .eq("id", params.id)
    .eq("sender_id", user.id)
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("messages")
    .update({
      is_deleted: true,
      content: null,
      file_url: null,
    })
    .eq("id", params.id)
    .eq("sender_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Message deleted" });
}
