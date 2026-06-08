-- 027_push_subscriptions.sql
--
-- Unified push subscriptions for BOTH platforms:
--   * platform = 'web'  → browser Web Push (VAPID). `endpoint` is the push URL
--                         from PushManager.subscribe; `p256dh`/`auth` are its
--                         encryption keys.
--   * platform = 'expo' → Expo (React Native) push. `endpoint` holds the
--                         ExponentPushToken; `p256dh`/`auth` are NULL.
--
-- One row per device. `endpoint` is the universal unique device key for both
-- platforms, so we upsert on it (re-subscribing a device refreshes the row
-- instead of duplicating). The server reads these via the service role and
-- dispatches by `platform`. Dead devices (web 404/410, expo DeviceNotRegistered)
-- are pruned by the server when a send fails.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'expo')),
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT,
  auth        TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Web rows must carry their encryption keys; expo rows must not need them.
  CONSTRAINT push_web_requires_keys
    CHECK (platform <> 'web' OR (p256dh IS NOT NULL AND auth IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users may manage only their own subscriptions. All server-side sending uses
-- the service role, which bypasses RLS — these policies just protect any
-- direct client access.
DROP POLICY IF EXISTS "Users manage own push subscriptions"
  ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
