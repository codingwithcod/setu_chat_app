-- ============================================
-- Admin Dashboard — Roles, Status & Stats
-- Run this in your Supabase SQL Editor.
-- ============================================

-- ============================================
-- 1. ROLE + STATUS COLUMNS ON PROFILES
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin')),
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- ============================================
-- 2. PROMOTE YOUR FIRST ADMIN
-- Replace the email below, then run this line once.
-- ============================================
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';

-- ============================================
-- 3. HELPER: is the current auth user an admin?
-- SECURITY DEFINER so it bypasses RLS and avoids
-- recursive policy evaluation.
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================
-- 4. RLS BACKSTOP — admins may read everything.
-- App routes use the service-role client, but these
-- policies make admin-by-role safe even via the
-- anon client.
-- ============================================
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- ============================================
-- 5. PLATFORM OVERVIEW STATS (single round-trip)
-- Returns one JSON object with all dashboard counters.
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
    'api_keys_active',    (SELECT COUNT(*) FROM public.api_keys WHERE is_active = true)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================
-- 6. DAILY SIGNUP + MESSAGE TREND (last N days)
-- ============================================
CREATE OR REPLACE FUNCTION public.admin_daily_trend(days INTEGER DEFAULT 14)
RETURNS TABLE (day DATE, signups BIGINT, messages BIGINT) AS $$
  SELECT
    d::date AS day,
    (SELECT COUNT(*) FROM public.profiles p
       WHERE p.created_at >= d AND p.created_at < d + INTERVAL '1 day') AS signups,
    (SELECT COUNT(*) FROM public.messages m
       WHERE m.created_at >= d AND m.created_at < d + INTERVAL '1 day') AS messages
  FROM generate_series(
    date_trunc('day', NOW()) - ((days - 1) || ' days')::interval,
    date_trunc('day', NOW()),
    '1 day'
  ) AS d
  ORDER BY d;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Only the service role / authenticated admins invoke these via the app.
REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM anon;
REVOKE ALL ON FUNCTION public.admin_daily_trend(INTEGER) FROM anon;
