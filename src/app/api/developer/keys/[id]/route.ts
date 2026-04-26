import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ALL_PERMISSION_SCOPES, type PermissionScope } from "@/lib/api-key-auth";

// PATCH /api/developer/keys/[id] — Update key (name, permissions, status, IPs, origins)
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
  const { data: existingKey, error: fetchError } = await serviceClient
    .from("api_keys")
    .select("id, user_id")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existingKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Name
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Key name is required" }, { status: 400 });
    }
    if (body.name.trim().length > 50) {
      return NextResponse.json({ error: "Key name must be 50 characters or less" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  // Permissions
  if (body.permissions !== undefined) {
    const resolvedPermissions: Record<string, boolean> = {};
    for (const [scope, value] of Object.entries(body.permissions)) {
      if (ALL_PERMISSION_SCOPES.includes(scope as PermissionScope) && value === true) {
        resolvedPermissions[scope] = true;
      }
    }
    if (Object.keys(resolvedPermissions).length === 0) {
      return NextResponse.json(
        { error: "At least one permission scope must be selected" },
        { status: 400 }
      );
    }
    updates.permissions = resolvedPermissions;
  }

  // Active status (toggle)
  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  // Allowed IPs
  if (body.allowed_ips !== undefined) {
    if (!Array.isArray(body.allowed_ips)) {
      return NextResponse.json({ error: "allowed_ips must be an array" }, { status: 400 });
    }
    updates.allowed_ips = body.allowed_ips
      .filter((ip: unknown) => typeof ip === "string" && (ip as string).trim().length > 0)
      .map((ip: string) => ip.trim());
  }

  // Allowed Origins
  if (body.allowed_origins !== undefined) {
    if (!Array.isArray(body.allowed_origins)) {
      return NextResponse.json({ error: "allowed_origins must be an array" }, { status: 400 });
    }
    updates.allowed_origins = body.allowed_origins
      .filter((o: unknown) => typeof o === "string" && (o as string).trim().length > 0)
      .map((o: string) => o.trim());
  }

  // Expiration
  if (body.expires_at !== undefined) {
    if (body.expires_at === null) {
      updates.expires_at = null;
    } else {
      const expiryDate = new Date(body.expires_at);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return NextResponse.json(
          { error: "Expiration date must be in the future" },
          { status: 400 }
        );
      }
      updates.expires_at = expiryDate.toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await serviceClient
    .from("api_keys")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, name, key_prefix, permissions, rate_limit_rpm, allowed_ips, allowed_origins, expires_at, last_used_at, total_requests, is_active, created_at, updated_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}

// DELETE /api/developer/keys/[id] — Soft-delete (deactivate) an API key
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

  // Soft-delete: set is_active = false
  const { data, error } = await serviceClient
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, name, is_active")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  return NextResponse.json({
    data,
    message: "API key has been deactivated",
  });
}
