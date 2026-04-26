/**
 * Webhook delivery engine.
 *
 * This module is used by BOTH internal routes and public API routes
 * to fire webhook events to subscribed users.
 *
 * Usage:
 *   import { fireWebhooks } from "@/lib/webhook-delivery";
 *   fireWebhooks(serviceClient, "message.received", conversationId, senderId, data);
 */

import { signWebhookPayload } from "@/lib/api-key-auth";
import crypto from "crypto";

/**
 * Fire webhook events to all subscribed users in a conversation (except sender).
 * This is fire-and-forget — errors are logged but never thrown.
 */
export async function fireWebhooks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  event: string,
  conversationId: string,
  senderId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventData: Record<string, any>
) {
  try {
    // Get all members of the conversation (except sender)
    const { data: members } = await serviceClient
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);

    if (!members || members.length === 0) return;

    const memberIds = members.map((m: { user_id: string }) => m.user_id);

    // Get all active webhooks for those members subscribed to this event
    const { data: webhooks } = await serviceClient
      .from("webhooks")
      .select("*")
      .in("user_id", memberIds)
      .eq("is_active", true)
      .contains("events", [event]);

    if (!webhooks || webhooks.length === 0) return;

    // Deliver each webhook (fire-and-forget)
    for (const webhook of webhooks) {
      const payload = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: eventData,
      });

      const signature = signWebhookPayload(payload, webhook.secret);
      const deliveryId = `dlv_${crypto.randomBytes(12).toString("hex")}`;

      deliverWebhook(serviceClient, webhook, payload, signature, deliveryId, event).catch((err) => {
        console.error("[Webhook] Delivery error:", err);
      });
    }
  } catch (err) {
    console.error("[Webhook] Failed to fire webhooks:", err);
  }
}

async function deliverWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webhook: any,
  payload: string,
  signature: string,
  deliveryId: string,
  event: string
) {
  const startTime = Date.now();
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Setu-Signature": signature,
        "X-Setu-Event": event,
        "X-Setu-Delivery-Id": deliveryId,
        "X-Setu-Timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = res.status;
    responseBody = await res.text().catch(() => null);
    success = res.status >= 200 && res.status < 300;
  } catch (err) {
    responseBody = String(err);
  }

  const responseTimeMs = Date.now() - startTime;

  // Log delivery
  await serviceClient.from("webhook_delivery_logs").insert({
    webhook_id: webhook.id,
    event,
    payload: JSON.parse(payload),
    status_code: statusCode,
    response_body: responseBody?.slice(0, 1000),
    response_time_ms: responseTimeMs,
    success,
  });

  // Update webhook metadata
  const updates: Record<string, unknown> = {
    last_triggered_at: new Date().toISOString(),
  };
  if (!success) {
    updates.failure_count = (webhook.failure_count || 0) + 1;
  }
  await serviceClient.from("webhooks").update(updates).eq("id", webhook.id);
}
