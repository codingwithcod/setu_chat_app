-- ============================================
-- OAuth 2.1 Authorization Server Tables
-- Migration 011
-- ============================================

-- ============================================
-- OAUTH CLIENTS (Dynamic Client Registration - RFC 7591)
-- ============================================
CREATE TABLE public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT,                          -- NULL for public clients, SHA-256 for confidential
  client_name TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  grant_types TEXT[] NOT NULL DEFAULT '{authorization_code}',
  response_types TEXT[] NOT NULL DEFAULT '{code}',
  scope TEXT,                                       -- space-separated scopes
  client_uri TEXT,
  logo_uri TEXT,
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_clients_client_id ON public.oauth_clients(client_id);

-- ============================================
-- OAUTH AUTHORIZATION CODES (short-lived, PKCE-protected)
-- ============================================
CREATE TABLE public.oauth_authorization_codes (
  code_hash TEXT PRIMARY KEY,                       -- SHA-256 of the raw code
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_challenge TEXT NOT NULL,                     -- PKCE (required by OAuth 2.1)
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_codes_client ON public.oauth_authorization_codes(client_id);
CREATE INDEX idx_oauth_codes_user ON public.oauth_authorization_codes(user_id);

-- ============================================
-- OAUTH ACCESS TOKENS
-- ============================================
CREATE TABLE public.oauth_access_tokens (
  token_hash TEXT PRIMARY KEY,                      -- SHA-256 of the raw token
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_access_tokens_client ON public.oauth_access_tokens(client_id);
CREATE INDEX idx_oauth_access_tokens_user ON public.oauth_access_tokens(user_id);
CREATE INDEX idx_oauth_access_tokens_expires ON public.oauth_access_tokens(expires_at);

-- ============================================
-- OAUTH REFRESH TOKENS
-- ============================================
CREATE TABLE public.oauth_refresh_tokens (
  token_hash TEXT PRIMARY KEY,                      -- SHA-256 of the raw token
  client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_refresh_tokens_client ON public.oauth_refresh_tokens(client_id);
CREATE INDEX idx_oauth_refresh_tokens_user ON public.oauth_refresh_tokens(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

-- All OAuth tables are managed by the service role only (server-side operations)
CREATE POLICY "Service role manages oauth_clients" ON public.oauth_clients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages oauth_authorization_codes" ON public.oauth_authorization_codes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages oauth_access_tokens" ON public.oauth_access_tokens
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages oauth_refresh_tokens" ON public.oauth_refresh_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CLEANUP: Periodic deletion of expired tokens
-- (Can be called via cron or manually)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.oauth_authorization_codes WHERE expires_at < NOW();
  DELETE FROM public.oauth_access_tokens WHERE expires_at < NOW();
  DELETE FROM public.oauth_refresh_tokens WHERE expires_at < NOW() OR revoked = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
