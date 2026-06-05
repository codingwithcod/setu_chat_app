/**
 * Append an entry to the admin audit log. Fire-and-forget: a logging failure
 * must never break the action it records, so errors are swallowed.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEntry {
  actorId: string;
  actorEmail: string;
  action: string; // e.g. 'user.ban', 'message.delete', 'settings.update'
  targetType?: string; // 'user' | 'group' | 'message' | 'api_key' | 'setting'
  targetId?: string;
  targetLabel?: string; // human-readable (name/email/title)
}

export async function logAdminAction(
  serviceClient: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await serviceClient.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      target_label: entry.targetLabel ?? null,
    });
  } catch {
    // Never let auditing break the underlying action.
  }
}
