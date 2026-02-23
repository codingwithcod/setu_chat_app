import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Toggle reaction on a message
export async function POST(
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

  const { reaction } = await request.json();

  // Check if reaction exists
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", params.id)
    .eq("user_id", user.id)
    .eq("reaction", reaction)
    .single();

  if (existing) {
    // Remove reaction
    await supabase
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);

    return NextResponse.json({ message: "Reaction removed", action: "removed" });
  }

  // Add reaction
  const { error } = await supabase.from("message_reactions").insert({
    message_id: params.id,
    user_id: user.id,
    reaction,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Reaction added", action: "added" }, { status: 201 });
}
