-- ============================================
-- Admin Dashboard — Developer / API analytics
-- Run this in your Supabase SQL Editor (depends on is_admin() from 014).
-- ============================================

-- Overview counters for the Developers page in one round-trip.
CREATE OR REPLACE FUNCTION public.admin_developer_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'keys_total',          (SELECT COUNT(*) FROM public.api_keys),
    'keys_active',         (SELECT COUNT(*) FROM public.api_keys WHERE is_active = true),
    'requests_24h',        (SELECT COUNT(*) FROM public.api_key_usage_logs WHERE created_at >= NOW() - INTERVAL '24 hours'),
    'requests_7d',         (SELECT COUNT(*) FROM public.api_key_usage_logs WHERE created_at >= NOW() - INTERVAL '7 days'),
    'errors_24h',          (SELECT COUNT(*) FROM public.api_key_usage_logs WHERE created_at >= NOW() - INTERVAL '24 hours' AND status_code >= 400),
    'avg_response_ms_24h', (SELECT COALESCE(ROUND(AVG(response_time_ms)), 0) FROM public.api_key_usage_logs WHERE created_at >= NOW() - INTERVAL '24 hours'),
    'webhooks_total',      (SELECT COUNT(*) FROM public.webhooks),
    'webhooks_active',     (SELECT COUNT(*) FROM public.webhooks WHERE is_active = true),
    'deliveries_7d',       (SELECT COUNT(*) FROM public.webhook_delivery_logs WHERE created_at >= NOW() - INTERVAL '7 days'),
    'deliveries_failed_7d',(SELECT COUNT(*) FROM public.webhook_delivery_logs WHERE created_at >= NOW() - INTERVAL '7 days' AND success = false)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Top API consumers over the last N days (by request volume).
CREATE OR REPLACE FUNCTION public.admin_top_api_consumers(p_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  requests BIGINT,
  errors BIGINT
) AS $$
  SELECT
    l.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    COUNT(*) AS requests,
    COUNT(*) FILTER (WHERE l.status_code >= 400) AS errors
  FROM public.api_key_usage_logs l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY l.user_id, p.full_name, p.username, p.avatar_url
  ORDER BY requests DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_developer_stats() FROM anon;
REVOKE ALL ON FUNCTION public.admin_top_api_consumers(INTEGER, INTEGER) FROM anon;
