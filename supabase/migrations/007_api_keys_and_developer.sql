-- ============================================
-- PUBLIC API — API Keys, Usage Logs, Webhooks & Plans
-- Migration 007
-- ============================================

-- ============================================
-- PLAN LIMITS TABLE (pricing tiers)
-- ============================================
CREATE TABLE public.plan_limits (
  plan TEXT PRIMARY KEY,
  max_api_keys INTEGER NOT NULL,
  rate_limit_rpm INTEGER NOT NULL,
  daily_request_limit INTEGER NOT NULL,
  max_webhooks INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO public.plan_limits VALUES
  ('free',     3,    60,   10000,   2, 'Free', true),
  ('plus',    10,   300,  100000,  10, 'Plus', true),
  ('pro',     25,  1000,  500000,  25, 'Pro',  true);

-- Add developer_plan column to profiles
ALTER TABLE public.profiles
  ADD COLUMN developer_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (developer_plan IN ('free', 'plus', 'pro'));

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  allowed_ips TEXT[] DEFAULT '{}',
  allowed_origins TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  total_requests BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- API KEY USAGE LOGS TABLE (auditing & analytics)
-- ============================================
CREATE TABLE public.api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_key ON public.api_key_usage_logs(api_key_id);
CREATE INDEX idx_usage_logs_user ON public.api_key_usage_logs(user_id);
CREATE INDEX idx_usage_logs_created ON public.api_key_usage_logs(created_at DESC);

-- ============================================
-- WEBHOOKS TABLE
-- ============================================
CREATE TABLE public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user ON public.webhooks(user_id);
CREATE INDEX idx_webhooks_active ON public.webhooks(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE TRIGGER webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- WEBHOOK DELIVERY LOGS TABLE
-- ============================================
CREATE TABLE public.webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_delivery_logs_webhook ON public.webhook_delivery_logs(webhook_id);
CREATE INDEX idx_webhook_delivery_logs_created ON public.webhook_delivery_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Plan limits: readable by all authenticated users
CREATE POLICY "Anyone can read plan limits" ON public.plan_limits
  FOR SELECT USING (true);

-- API Keys: users manage their own
CREATE POLICY "Users manage own keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role manages all keys" ON public.api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Usage logs: users view their own
CREATE POLICY "Users view own usage logs" ON public.api_key_usage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role manages all usage logs" ON public.api_key_usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Webhooks: users manage their own
CREATE POLICY "Users manage own webhooks" ON public.webhooks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role manages all webhooks" ON public.webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- Webhook delivery logs: users view their own
CREATE POLICY "Users view own delivery logs" ON public.webhook_delivery_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.webhooks WHERE id = webhook_id AND user_id = auth.uid())
  );

CREATE POLICY "Service role manages all delivery logs" ON public.webhook_delivery_logs
  FOR ALL USING (auth.role() = 'service_role');
