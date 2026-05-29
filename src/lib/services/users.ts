import { ServiceCtx, ServiceResult, ok, err } from "./types";

export async function searchUsers(
  { serviceClient, userId }: ServiceCtx,
  query: string,
  limitInput?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const limit = Math.min(limitInput || 20, 50);

  if (!query || query.length < 2) {
    return err("INVALID_REQUEST", "Search query 'q' must be at least 2 characters", 400);
  }

  const { data: users, error } = await serviceClient
    .from("profiles")
    .select("id, username, first_name, last_name, full_name, avatar_url, is_online")
    .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,full_name.ilike.%${query}%`)
    .neq("id", userId)
    .limit(limit);

  if (error) return err("INTERNAL_ERROR", error.message, 500);
  return ok(users);
}

export async function getUserProfile(
  { serviceClient }: ServiceCtx,
  targetUserId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("id, username, first_name, last_name, full_name, avatar_url, is_online, last_seen, created_at")
    .eq("id", targetUserId)
    .single();

  if (error || !profile) return err("NOT_FOUND", "User not found", 404);
  return ok(profile);
}
