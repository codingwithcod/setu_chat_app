import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

// Get 5 most recently active users as suggestions
export async function GET() {
  const serviceClient = await createServiceClient();

  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // One RPC returns the 5 most recently active users (with a username) who are
  // not me and don't already share a private conversation with me. Replaces the
  // previous 4 serial round-trips (my conversations → private ones → their other
  // members → filtered profiles) with a single DB call.
  const { data, error } = await serviceClient.rpc("get_suggested_users", {
    p_user_id: auth.userId,
    p_limit: 5,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
