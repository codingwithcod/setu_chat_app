-- ============================================
-- Admin Dashboard — Platform settings & audit log
-- Run this in your Supabase SQL Editor (depends on is_admin() from 014).
-- ============================================

-- ============================================
-- 1. APP SETTINGS (key/value feature flags)
-- ============================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the two flags the app enforces.
INSERT INTO public.app_settings (key, value) VALUES
  ('allow_registration', true),
  ('maintenance_mode', false)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Flags are non-sensitive booleans and are read by the middleware via the
-- anon client, so allow public read. Only admins may change them.
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings" ON public.app_settings
  FOR UPDATE USING (public.is_admin());

-- ============================================
-- 2. ADMIN AUDIT LOG
-- Denormalised actor_email / target_label so the feed renders cheaply and
-- survives deletion of the referenced rows.
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the log (writes happen via the service-role client).
DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log
  FOR SELECT USING (public.is_admin());
