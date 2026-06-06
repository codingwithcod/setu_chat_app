import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const supabase = await createClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = { id: auth.userId };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, full_name, avatar_url, is_online")
    .or(
      `username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,full_name.ilike.%${query}%`
    )
    .neq("id", user.id)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
