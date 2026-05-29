import { ServiceCtx, ServiceResult, ok, err } from "./types";

export async function getAccount(
  { serviceClient, userId }: ServiceCtx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ServiceResult<any>> {
  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("id, email, username, first_name, last_name, full_name, avatar_url, is_online, last_seen, developer_plan, created_at")
    .eq("id", userId)
    .single();

  if (error) return err("INTERNAL_ERROR", "Failed to fetch account", 500);

  return ok({ ...profile, plan: profile.developer_plan });
}
