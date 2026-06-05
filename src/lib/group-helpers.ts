import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get the role of a user in a conversation.
 * Returns "owner" | "admin" | "member" | null (null = not a member)
 */
export async function getMemberRole(
  serviceClient: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<"owner" | "admin" | "member" | null> {
  const { data } = await serviceClient
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .single();

  return data?.role || null;
}

/**
 * Get the roles of several users in a conversation in ONE query.
 * Returns a Map of user_id → role for the members found (absent = not a member,
 * i.e. treat as null), so callers can resolve multiple roles without a separate
 * round-trip per user.
 */
export async function getMemberRoles(
  serviceClient: SupabaseClient,
  conversationId: string,
  userIds: string[]
): Promise<Map<string, "owner" | "admin" | "member">> {
  const { data } = await serviceClient
    .from("conversation_members")
    .select("user_id, role")
    .eq("conversation_id", conversationId)
    .in("user_id", userIds);

  const roles = new Map<string, "owner" | "admin" | "member">();
  for (const row of (data || []) as Array<{
    user_id: string;
    role: "owner" | "admin" | "member";
  }>) {
    roles.set(row.user_id, row.role);
  }
  return roles;
}

/**
 * Send a system message in a conversation.
 *
 * Only inserts the message — we no longer manually update
 * conversations.last_message_at here, because the `on_new_message` AFTER INSERT
 * trigger on `messages` already sets it (to the new message's created_at) on
 * every insert. The manual update was a redundant second round-trip. Dropping it
 * is behavior-equivalent: the conversation's last_message_at still bumps on each
 * system message (via the trigger), which is what conversation ordering uses.
 */
export async function sendSystemMessage(
  serviceClient: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string
) {
  await serviceClient.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    message_type: "system",
  });
}

/**
 * Get display name for a user by ID (e.g. "Abhi Patel")
 */
export async function getUserDisplayName(
  serviceClient: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await serviceClient
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .single();

  if (!data) return "Unknown User";
  return `${data.first_name} ${data.last_name}`.trim();
}

/**
 * Get display names for multiple user IDs.
 * Returns a comma-separated string: "Abhi Patel, Rahul S. and Priya K."
 */
export async function getUserDisplayNames(
  serviceClient: SupabaseClient,
  userIds: string[]
): Promise<string> {
  const { data } = await serviceClient
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", userIds);

  if (!data || data.length === 0) return "Unknown User";

  const names = userIds.map((id) => {
    const profile = data.find((p) => p.id === id);
    return profile
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : "Unknown User";
  });

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Check if a user has at least the required permission level.
 * Permission hierarchy: owner > admin > member
 */
export function hasPermission(
  userRole: "owner" | "admin" | "member" | null,
  requiredLevel: "owner" | "admin" | "member"
): boolean {
  if (!userRole) return false;
  const hierarchy = { owner: 3, admin: 2, member: 1 };
  return hierarchy[userRole] >= hierarchy[requiredLevel];
}
