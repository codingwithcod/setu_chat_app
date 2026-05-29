import crypto from "crypto";
import { ALL_WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/api-key-auth";
import { ServiceCtx, ServiceResult, ok, err } from "./types";

const WEBHOOK_SELECT = "id, name, url, events, is_active, last_triggered_at, failure_count, created_at";

export async function listWebhooks(
  { serviceClient, userId }: ServiceCtx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: webhooks, error } = await serviceClient
    .from("webhooks")
    .select(WEBHOOK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(webhooks);
}

export interface CreateWebhookParams {
  name?: string;
  url?: string;
  events?: string[];
}

export async function createWebhook(
  { serviceClient, userId }: ServiceCtx,
  params: CreateWebhookParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { name, url, events } = params;

  if (!name || typeof name !== "string") {
    return err("INVALID_REQUEST", "name is required", 400);
  }
  if (!url || typeof url !== "string") {
    return err("INVALID_REQUEST", "url is required", 400);
  }

  try {
    const parsedUrl = new URL(url);
    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      return err("INVALID_REQUEST", "URL must use HTTP or HTTPS", 400);
    }
  } catch {
    return err("INVALID_REQUEST", "Invalid URL format", 400);
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    return err("INVALID_REQUEST", "At least one event must be selected", 400);
  }

  const validEvents = events.filter((e: string) => ALL_WEBHOOK_EVENTS.includes(e as WebhookEvent));
  if (validEvents.length === 0) {
    return err("INVALID_REQUEST", "No valid events selected", 400);
  }

  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const { data: webhook, error } = await serviceClient
    .from("webhooks")
    .insert({
      user_id: userId,
      name: name.trim(),
      url: url.trim(),
      secret,
      events: validEvents,
    })
    .select("*")
    .single();

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(webhook, 201);
}

export interface UpdateWebhookParams {
  name?: string;
  url?: string;
  events?: string[];
  is_active?: boolean;
}

export async function updateWebhook(
  { serviceClient, userId }: ServiceCtx,
  webhookId: string,
  params: UpdateWebhookParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: existing } = await serviceClient
    .from("webhooks")
    .select("id")
    .eq("id", webhookId)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    return err("NOT_FOUND", "Webhook not found", 404);
  }

  const updates: Record<string, unknown> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.url !== undefined) updates.url = params.url;
  if (params.is_active !== undefined) updates.is_active = Boolean(params.is_active);

  if (params.events !== undefined) {
    if (!Array.isArray(params.events) || params.events.length === 0) {
      return err("INVALID_REQUEST", "At least one event is required", 400);
    }
    updates.events = params.events.filter((e: string) => ALL_WEBHOOK_EVENTS.includes(e as WebhookEvent));
  }

  const { data: updated, error } = await serviceClient
    .from("webhooks")
    .update(updates)
    .eq("id", webhookId)
    .select("id, name, url, events, is_active, last_triggered_at, failure_count, created_at, updated_at")
    .single();

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(updated);
}

export async function deleteWebhook(
  { serviceClient, userId }: ServiceCtx,
  webhookId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { error } = await serviceClient
    .from("webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("user_id", userId);

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok({ id: webhookId, deleted: true });
}
