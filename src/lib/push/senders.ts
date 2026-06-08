import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cross-platform push sender. Reads the recipients' subscriptions from
 * `push_subscriptions` and dispatches each one by platform:
 *   - 'web'  → Web Push (VAPID), via the `web-push` library.
 *   - 'expo' → Expo push service, via a plain HTTPS POST.
 *
 * Dead devices are pruned: Web Push 404/410 and Expo "DeviceNotRegistered"
 * both mean the token is gone, so we delete the row.
 *
 * All sending uses the service-role client (RLS-bypassing) and is fire-and-
 * forget from the caller's perspective — failures are logged, never thrown.
 */

let vapidConfigured = false;

function ensureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@setu.app";
  if (!publicKey || !privateKey) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  conversationId?: string;
  url?: string;
  icon?: string;
  badge?: string;
}

interface SubscriptionRow {
  id: string;
  platform: "web" | "expo";
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
}

/**
 * Send a push payload to every device of the given users.
 */
export async function sendPushToUsers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: SupabaseClient<any, any, any>,
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  if (userIds.length === 0) return;

  const { data: subs } = await serviceClient
    .from("push_subscriptions")
    .select("id, platform, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return;

  const rows = subs as SubscriptionRow[];
  const deadIds: string[] = [];

  const webRows = rows.filter((r) => r.platform === "web");
  const expoRows = rows.filter((r) => r.platform === "expo");

  await Promise.all([
    sendWeb(webRows, payload, deadIds),
    sendExpo(expoRows, payload, deadIds),
  ]);

  if (deadIds.length > 0) {
    await serviceClient.from("push_subscriptions").delete().in("id", deadIds);
  }
}

async function sendWeb(
  rows: SubscriptionRow[],
  payload: PushPayload,
  deadIds: string[]
): Promise<void> {
  if (rows.length === 0) return;
  if (!ensureVapid()) {
    console.error("[push] VAPID keys not configured — skipping web push");
    return;
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    conversationId: payload.conversationId,
    url: payload.url,
    icon: payload.icon || "/icons/setu-logo.png",
    badge: payload.badge || "/icons/setu-badge.png",
  });

  await Promise.all(
    rows.map(async (row) => {
      if (!row.p256dh || !row.auth) return;
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body
        );
      } catch (e) {
        const statusCode = (e as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadIds.push(row.id);
        } else {
          console.error("[push] web send failed:", statusCode || e);
        }
      }
    })
  );
}

async function sendExpo(
  rows: SubscriptionRow[],
  payload: PushPayload,
  deadIds: string[]
): Promise<void> {
  if (rows.length === 0) return;

  // Expo accepts up to 100 messages per request.
  const byEndpoint = new Map(rows.map((r) => [r.endpoint, r.id]));
  const messages = rows.map((r) => ({
    to: r.endpoint,
    title: payload.title,
    body: payload.body,
    sound: "default",
    data: {
      conversationId: payload.conversationId,
      url: payload.url,
    },
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error("[push] expo send HTTP error:", res.status);
      return;
    }

    const json = (await res.json()) as {
      data?: Array<{
        status: "ok" | "error";
        details?: { error?: string };
      }>;
    };

    // Responses are returned in the same order as the messages we sent.
    json.data?.forEach((ticket, i) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        const endpoint = messages[i].to;
        const id = byEndpoint.get(endpoint);
        if (id) deadIds.push(id);
      }
    });
  } catch (e) {
    console.error("[push] expo send failed:", e);
  }
}
