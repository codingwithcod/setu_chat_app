import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ALL_WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/api-key-auth";

// PATCH /api/developer/webhooks/[id] — Update a webhook
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  // Verify ownership
  const { data: existing } = await serviceClient
    .from("webhooks")
    .select("id, user_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Webhook name is required" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.url !== undefined) {
    try {
      const parsedUrl = new URL(body.url);
      if (!["https:", "http:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Webhook URL must use HTTP or HTTPS" }, { status: 400 });
      }
      updates.url = body.url.trim();
    } catch {
      return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
    }
  }

  if (body.events !== undefined) {
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ error: "At least one event must be selected" }, { status: 400 });
    }
    const validEvents = body.events.filter((e: string) =>
      ALL_WEBHOOK_EVENTS.includes(e as WebhookEvent)
    );
    if (validEvents.length === 0) {
      return NextResponse.json({ error: "No valid events selected" }, { status: 400 });
    }
    updates.events = validEvents;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await serviceClient
    .from("webhooks")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}

// DELETE /api/developer/webhooks/[id] — Delete a webhook
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  const { error } = await serviceClient
    .from("webhooks")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Webhook deleted" });
}
