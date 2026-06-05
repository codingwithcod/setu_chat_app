-- ============================================
-- Report-driven Moderation — message_reports
-- Run this in your Supabase SQL Editor.
--
-- Privacy model: admins never browse private messages. A message only
-- becomes visible to moderators once a member of the conversation reports
-- it. This table is that queue.
-- ============================================

CREATE TABLE IF NOT EXISTS public.message_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL
    CHECK (reason IN ('spam', 'harassment', 'hate', 'violence', 'sexual', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A user can only report a given message once.
  UNIQUE (message_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reports_status
  ON public.message_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reports_message
  ON public.message_reports(message_id);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- A member may file a report for a message in a conversation they belong to,
-- as themselves.
DROP POLICY IF EXISTS "Members can report messages" ON public.message_reports;
CREATE POLICY "Members can report messages" ON public.message_reports
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = message_reports.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Reporters can see the status of their own reports.
DROP POLICY IF EXISTS "Reporters can view own reports" ON public.message_reports;
CREATE POLICY "Reporters can view own reports" ON public.message_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Admins can read and resolve everything (backstop; the app uses the
-- service-role client behind requireAdmin()).
DROP POLICY IF EXISTS "Admins can read all reports" ON public.message_reports;
CREATE POLICY "Admins can read all reports" ON public.message_reports
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.message_reports;
CREATE POLICY "Admins can update reports" ON public.message_reports
  FOR UPDATE USING (public.is_admin());

-- ============================================
-- Add pending-report count to the dashboard stats RPC.
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'users_total',        (SELECT COUNT(*) FROM public.profiles),
    'users_online',       (SELECT COUNT(*) FROM public.profiles WHERE is_online = true),
    'users_banned',       (SELECT COUNT(*) FROM public.profiles WHERE is_banned = true),
    'users_verified',     (SELECT COUNT(*) FROM public.profiles WHERE is_email_verified = true),
    'users_2fa',          (SELECT COUNT(*) FROM public.profiles WHERE totp_enabled = true),
    'users_admins',       (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin'),
    'signups_today',      (SELECT COUNT(*) FROM public.profiles WHERE created_at >= date_trunc('day', NOW())),
    'signups_7d',         (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days'),
    'signups_30d',        (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days'),
    'groups_total',       (SELECT COUNT(*) FROM public.conversations WHERE type = 'group'),
    'private_total',      (SELECT COUNT(*) FROM public.conversations WHERE type = 'private'),
    'messages_total',     (SELECT COUNT(*) FROM public.messages),
    'messages_today',     (SELECT COUNT(*) FROM public.messages WHERE created_at >= date_trunc('day', NOW())),
    'messages_7d',        (SELECT COUNT(*) FROM public.messages WHERE created_at >= NOW() - INTERVAL '7 days'),
    'sessions_active',    (SELECT COUNT(*) FROM public.user_sessions WHERE last_active_at >= NOW() - INTERVAL '5 minutes'),
    'api_keys_active',    (SELECT COUNT(*) FROM public.api_keys WHERE is_active = true),
    'reports_pending',    (SELECT COUNT(*) FROM public.message_reports WHERE status = 'pending')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
