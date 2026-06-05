-- ============================================
-- Admin Dashboard — Analytics overview
-- Run this in your Supabase SQL Editor (depends on is_admin() from 014).
-- Reuses admin_daily_trend(days) from migration 014 for time series.
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_analytics_overview()
RETURNS JSON AS $$
  SELECT json_build_object(
    -- Active users (by last_seen presence).
    'dau',             (SELECT COUNT(*) FROM public.profiles WHERE last_seen >= NOW() - INTERVAL '1 day'),
    'wau',             (SELECT COUNT(*) FROM public.profiles WHERE last_seen >= NOW() - INTERVAL '7 days'),
    'mau',             (SELECT COUNT(*) FROM public.profiles WHERE last_seen >= NOW() - INTERVAL '30 days'),
    'users_total',     (SELECT COUNT(*) FROM public.profiles),

    -- Auth provider mix (auth_providers is a text[]; a user may have both).
    'provider_email',  (SELECT COUNT(*) FROM public.profiles WHERE 'email'  = ANY(auth_providers)),
    'provider_google', (SELECT COUNT(*) FROM public.profiles WHERE 'google' = ANY(auth_providers)),

    -- Conversation split.
    'conv_group',      (SELECT COUNT(*) FROM public.conversations WHERE type = 'group'),
    'conv_private',    (SELECT COUNT(*) FROM public.conversations WHERE type = 'private'),

    -- Message type breakdown.
    'msg_text',        (SELECT COUNT(*) FROM public.messages WHERE message_type = 'text'),
    'msg_image',       (SELECT COUNT(*) FROM public.messages WHERE message_type = 'image'),
    'msg_file',        (SELECT COUNT(*) FROM public.messages WHERE message_type = 'file'),
    'msg_total',       (SELECT COUNT(*) FROM public.messages)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_analytics_overview() FROM anon;
