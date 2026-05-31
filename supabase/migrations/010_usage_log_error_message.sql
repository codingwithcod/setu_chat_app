-- ============================================
-- Add error_message column to api_key_usage_logs
-- Migration 010
-- ============================================

ALTER TABLE public.api_key_usage_logs
  ADD COLUMN error_message TEXT;

-- Index for quick filtering of error logs
CREATE INDEX idx_usage_logs_status ON public.api_key_usage_logs(status_code)
  WHERE status_code >= 400;
