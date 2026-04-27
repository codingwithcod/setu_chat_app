import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateApiKey, PERMISSION_PRESETS, ALL_PERMISSION_SCOPES, type PermissionScope } from "@/lib/api-key-auth";

// GET /api/developer/keys — List all API keys for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  const { data: keys, error } = await serviceClient
    .from("api_keys")
    .select("id, user_id, name, key_prefix, permissions, rate_limit_rpm, allowed_ips, allowed_origins, expires_at, last_used_at, total_requests, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: keys });
}

// POST /api/developer/keys — Create a new API key
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  // Check 2FA requirement
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("totp_enabled, developer_plan")
    .eq("id", user.id)
    .single();

  if (!profile?.totp_enabled) {
    return NextResponse.json(
      { error: "Two-factor authentication must be enabled before creating API keys. Go to Settings > Two-Factor Authentication to set it up." },
      { status: 403 }
    );
  }

  // Check plan limits
  const { data: planLimits } = await serviceClient
    .from("plan_limits")
    .select("*")
    .eq("plan", profile.developer_plan || "free")
    .single();

  const { count: existingKeysCount } = await serviceClient
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (planLimits && existingKeysCount !== null && existingKeysCount >= planLimits.max_api_keys) {
    return NextResponse.json(
      { error: `You have reached the maximum of ${planLimits.max_api_keys} API keys for the ${planLimits.display_name} plan. Upgrade your plan to create more keys.` },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await request.json();
  const { name, permissions, preset, expiresAt, allowedIps, allowedOrigins } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Key name is required" }, { status: 400 });
  }

  if (name.trim().length > 50) {
    return NextResponse.json({ error: "Key name must be 50 characters or less" }, { status: 400 });
  }

  // Build permissions object
  const resolvedPermissions: Record<string, boolean> = {};

  if (preset && PERMISSION_PRESETS[preset]) {
    // Use preset template
    for (const scope of PERMISSION_PRESETS[preset].scopes) {
      resolvedPermissions[scope] = true;
    }
  } else if (permissions && typeof permissions === "object") {
    // Custom permissions — validate each scope
    for (const [scope, value] of Object.entries(permissions)) {
      if (ALL_PERMISSION_SCOPES.includes(scope as PermissionScope) && value === true) {
        resolvedPermissions[scope] = true;
      }
    }
  } else {
    return NextResponse.json(
      { error: "Either a preset or custom permissions must be provided" },
      { status: 400 }
    );
  }

  // At least one permission required
  if (Object.keys(resolvedPermissions).length === 0) {
    return NextResponse.json(
      { error: "At least one permission scope must be selected" },
      { status: 400 }
    );
  }

  // Generate key
  const { raw, hash, prefix } = generateApiKey();

  // Determine rate limit from user's plan
  const rateLimit = planLimits?.rate_limit_rpm || 60;

  // Validate expiration
  let parsedExpiry: string | null = null;
  if (expiresAt) {
    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return NextResponse.json(
        { error: "Expiration date must be in the future" },
        { status: 400 }
      );
    }
    parsedExpiry = expiryDate.toISOString();
  }

  // Validate IPs
  const validatedIps: string[] = [];
  if (allowedIps && Array.isArray(allowedIps)) {
    for (const ip of allowedIps) {
      if (typeof ip === "string" && ip.trim().length > 0) {
        validatedIps.push(ip.trim());
      }
    }
  }

  // Validate Origins
  const validatedOrigins: string[] = [];
  if (allowedOrigins && Array.isArray(allowedOrigins)) {
    for (const origin of allowedOrigins) {
      if (typeof origin === "string" && origin.trim().length > 0) {
        validatedOrigins.push(origin.trim());
      }
    }
  }

  // Insert key
  const { data: newKey, error: insertError } = await serviceClient
    .from("api_keys")
    .insert({
      user_id: user.id,
      name: name.trim(),
      key_prefix: prefix,
      key_hash: hash,
      permissions: resolvedPermissions,
      rate_limit_rpm: rateLimit,
      allowed_ips: validatedIps,
      allowed_origins: validatedOrigins,
      expires_at: parsedExpiry,
    })
    .select("id, name, key_prefix, permissions, rate_limit_rpm, allowed_ips, allowed_origins, expires_at, is_active, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Return the key WITH the raw key (shown only once!)
  return NextResponse.json({
    data: {
      ...newKey,
      raw_key: raw, // This is the only time the raw key is returned
    },
    message: "API key created successfully. Copy the key now — it won't be shown again.",
  }, { status: 201 });
}
