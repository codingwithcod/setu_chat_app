-- ============================================
-- USER SESSIONS TABLE — Multi-Session Management
-- ============================================

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  device_type TEXT NOT NULL DEFAULT 'desktop_browser'
    CHECK (device_type IN ('desktop_app', 'desktop_browser', 'mobile_app', 'mobile_browser', 'tablet_browser')),
  browser_name TEXT,
  os_name TEXT,
  ip_address TEXT,
  location TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_last_active ON public.user_sessions(last_active_at);

-- ============================================
-- AUTO-CLEANUP: Delete sessions inactive > 30 days
-- Runs whenever a new session is inserted
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE last_active_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_insert_cleanup
  AFTER INSERT ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_stale_sessions();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all sessions (for API routes)
CREATE POLICY "Service role manages all sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- REPLICA IDENTITY (needed for Realtime DELETE events to include all columns)
-- ============================================
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
