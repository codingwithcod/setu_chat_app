-- ============================================
-- TOTP Two-Factor Authentication Support
-- ============================================

-- Add TOTP columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];

-- Pending TOTP setup tracking (separate table for security)
CREATE TABLE IF NOT EXISTS public.totp_setup_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  temp_secret TEXT NOT NULL,
  first_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'first_verified', 'confirmed', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_totp_setup_user ON public.totp_setup_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_totp_setup_expires ON public.totp_setup_sessions(expires_at);

-- RLS
ALTER TABLE public.totp_setup_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role (server-side API) can manage TOTP setup sessions
CREATE POLICY "Service role manages totp setup"
  ON public.totp_setup_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Cleanup: auto-delete expired setup sessions (optional — can run via cron)
-- DELETE FROM public.totp_setup_sessions WHERE expires_at < NOW();
