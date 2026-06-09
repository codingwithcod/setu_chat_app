import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = { id: auth.userId };

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.firstName !== undefined) updates.first_name = body.firstName;
  if (body.lastName !== undefined) updates.last_name = body.lastName;
  if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl;
  if (body.username !== undefined) {
    // Check username uniqueness
    const { data: existing } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("username", body.username)
      .neq("id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      );
    }
    updates.username = body.username;
  }

  const { data, error } = await serviceClient
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
