import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/verify-token";

/**
 * POST /api/push/subscribe
 *
 * Registers a device for push. Used by BOTH the web app and the Expo mobile app
 * (auth works via cookie or Bearer token). Upserts on `endpoint` so re-running
 * for the same device refreshes the row instead of duplicating it.
 *
 * Web body:  { platform: "web", subscription: { endpoint, keys: { p256dh, auth } } }
 * Expo body: { platform: "expo", token: "ExponentPushToken[...]" }
 */
export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const platform: "web" | "expo" = body.platform === "expo" ? "expo" : "web";
  const userAgent = request.headers.get("user-agent");

  let row: {
    user_id: string;
    platform: "web" | "expo";
    endpoint: string;
    p256dh: string | null;
    auth: string | null;
    user_agent: string | null;
    updated_at: string;
  };

  if (platform === "expo") {
    const token: string | undefined = body.token;
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    row = {
      user_id: auth.userId,
      platform: "expo",
      endpoint: token,
      p256dh: null,
      auth: null,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    };
  } else {
    const sub = body.subscription;
    const endpoint: string | undefined = sub?.endpoint;
    const p256dh: string | undefined = sub?.keys?.p256dh;
    const authKey: string | undefined = sub?.keys?.auth;
    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: "subscription with endpoint and keys is required" },
        { status: 400 }
      );
    }
    row = {
      user_id: auth.userId,
      platform: "web",
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    };
  }

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ok: true } });
}
