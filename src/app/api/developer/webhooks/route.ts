import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ALL_WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/api-key-auth";

// GET /api/developer/webhooks — List all webhooks for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  const { data: webhooks, error } = await serviceClient
    .from("webhooks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: webhooks });
}

// POST /api/developer/webhooks — Create a new webhook
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  // Check plan limits
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("developer_plan")
    .eq("id", user.id)
    .single();

  const { data: planLimits } = await serviceClient
    .from("plan_limits")
    .select("*")
    .eq("plan", profile?.developer_plan || "free")
    .single();

  const { count: existingCount } = await serviceClient
    .from("webhooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (planLimits && existingCount !== null && existingCount >= planLimits.max_webhooks) {
    return NextResponse.json(
      { error: `You have reached the maximum of ${planLimits.max_webhooks} webhooks for the ${planLimits.display_name} plan.` },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, url, events } = body;

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Webhook name is required" }, { status: 400 });
  }
  if (name.trim().length > 50) {
    return NextResponse.json({ error: "Webhook name must be 50 characters or less" }, { status: 400 });
  }

  // Validate URL
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
  }
  try {
    const parsedUrl = new URL(url);
    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Webhook URL must use HTTP or HTTPS" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
  }

  // Validate events
  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "At least one event must be selected" }, { status: 400 });
  }

  const validEvents = events.filter((e: string) =>
    ALL_WEBHOOK_EVENTS.includes(e as WebhookEvent)
  );

  if (validEvents.length === 0) {
    return NextResponse.json({ error: "No valid events selected" }, { status: 400 });
  }

  // Generate webhook secret
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const { data: webhook, error: insertError } = await serviceClient
    .from("webhooks")
    .insert({
      user_id: user.id,
      name: name.trim(),
      url: url.trim(),
      secret,
      events: validEvents,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: webhook,
    message: "Webhook created successfully. Save the signing secret — it won't be fully shown again.",
  }, { status: 201 });
}
