import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Ensure the "Saved Messages" (self) conversation exists for the current user
export async function POST() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Direct query: find any "self" type conversation where this user is a member
  const { data: selfConvs } = await serviceClient
    .from("conversations")
    .select("id, type, created_by")
    .eq("type", "self")
    .eq("created_by", user.id);

  if (selfConvs && selfConvs.length > 0) {
    // If there are duplicates, clean them up — keep only the first
    if (selfConvs.length > 1) {
      const keepId = selfConvs[0].id;
      const deleteIds = selfConvs.slice(1).map((c) => c.id);

      for (const id of deleteIds) {
        await serviceClient
          .from("conversation_members")
          .delete()
          .eq("conversation_id", id);
        await serviceClient.from("conversations").delete().eq("id", id);
      }
    }

    return NextResponse.json({ data: selfConvs[0], created: false });
  }

  // Create the self conversation
  const { data: newConv, error: convError } = await serviceClient
    .from("conversations")
    .insert({
      type: "self",
      name: "Saved Messages",
      created_by: user.id,
    })
    .select()
    .single();

  if (convError || !newConv) {
    console.error("Failed to create self conversation:", convError?.message);
    return NextResponse.json(
      { error: "Failed to create saved messages" },
      { status: 500 }
    );
  }

  // Add the user as the only member
  await serviceClient.from("conversation_members").insert({
    conversation_id: newConv.id,
    user_id: user.id,
    role: "admin",
  });

  // Double-check: if a race condition created duplicates, clean up
  const { data: allSelf } = await serviceClient
    .from("conversations")
    .select("id")
    .eq("type", "self")
    .eq("created_by", user.id)
    .order("created_at", { ascending: true });

  if (allSelf && allSelf.length > 1) {
    const deleteIds = allSelf.slice(1).map((c) => c.id);
    for (const id of deleteIds) {
      await serviceClient
        .from("conversation_members")
        .delete()
        .eq("conversation_id", id);
      await serviceClient.from("conversations").delete().eq("id", id);
    }
  }

  return NextResponse.json({ data: newConv, created: true });
}
