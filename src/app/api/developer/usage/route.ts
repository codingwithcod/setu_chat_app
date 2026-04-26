import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET /api/developer/usage — Get usage analytics for the current user
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();
  const searchParams = request.nextUrl.searchParams;
  const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);
  const keyId = searchParams.get("key_id");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Build base query
  let query = serviceClient
    .from("api_key_usage_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (keyId) {
    query = query.eq("api_key_id", keyId);
  }

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute summary stats
  const totalRequests = logs?.length || 0;
  const successCount = logs?.filter((l) => l.status_code >= 200 && l.status_code < 300).length || 0;
  const errorCount = logs?.filter((l) => l.status_code >= 400).length || 0;
  const avgResponseTime = totalRequests > 0
    ? Math.round(
        (logs || []).reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / totalRequests
      )
    : 0;

  // Group by day for chart data
  const dailyStats: Record<string, { requests: number; errors: number }> = {};
  for (const log of logs || []) {
    const day = log.created_at.slice(0, 10); // YYYY-MM-DD
    if (!dailyStats[day]) {
      dailyStats[day] = { requests: 0, errors: 0 };
    }
    dailyStats[day].requests++;
    if (log.status_code >= 400) {
      dailyStats[day].errors++;
    }
  }

  // Group by endpoint
  const endpointStats: Record<string, number> = {};
  for (const log of logs || []) {
    const key = `${log.method} ${log.endpoint}`;
    endpointStats[key] = (endpointStats[key] || 0) + 1;
  }

  // Recent activity (last 20)
  const recentActivity = (logs || []).slice(0, 20).map((l) => ({
    id: l.id,
    endpoint: l.endpoint,
    method: l.method,
    status_code: l.status_code,
    response_time_ms: l.response_time_ms,
    ip_address: l.ip_address,
    created_at: l.created_at,
  }));

  // Get user's plan info
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

  // Count active keys and webhooks
  const { count: activeKeys } = await serviceClient
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { count: activeWebhooks } = await serviceClient
    .from("webhooks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  return NextResponse.json({
    data: {
      summary: {
        total_requests: totalRequests,
        success_count: successCount,
        error_count: errorCount,
        avg_response_time_ms: avgResponseTime,
        active_keys: activeKeys || 0,
        active_webhooks: activeWebhooks || 0,
      },
      plan: {
        current: profile?.developer_plan || "free",
        limits: planLimits,
      },
      daily_stats: dailyStats,
      endpoint_stats: endpointStats,
      recent_activity: recentActivity,
    },
  });
}
