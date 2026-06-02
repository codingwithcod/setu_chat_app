/**
 * OAuth scope mapping — bridges MCP OAuth scopes to internal permission scopes.
 *
 * MCP clients request scopes as space-separated strings like:
 *   "messages:send messages:read conversations:read"
 *
 * These map 1:1 to the existing PermissionScope type.
 */

import { ALL_PERMISSION_SCOPES, type PermissionScope } from "@/lib/api-key-auth";

export type { PermissionScope };

/**
 * Parse a space-separated scope string into validated PermissionScope[].
 * Unknown scopes are silently dropped.
 */
export function parseScopes(scopeString: string | null | undefined): PermissionScope[] {
  if (!scopeString) return [];
  const valid = new Set<string>(ALL_PERMISSION_SCOPES);
  return scopeString
    .split(/\s+/)
    .filter((s) => valid.has(s)) as PermissionScope[];
}

/**
 * Serialize PermissionScope[] to a space-separated string.
 */
export function serializeScopes(scopes: PermissionScope[]): string {
  return scopes.join(" ");
}

/**
 * Build a permissions record from scopes (matching api_keys.permissions shape).
 */
export function scopesToPermissions(scopes: PermissionScope[]): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  for (const scope of ALL_PERMISSION_SCOPES) {
    permissions[scope] = scopes.includes(scope);
  }
  return permissions;
}

/**
 * All scopes formatted as a space-separated string (for metadata endpoint).
 */
export const ALL_SCOPES_STRING = ALL_PERMISSION_SCOPES.join(" ");
