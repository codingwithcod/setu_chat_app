-- 021_harden_function_grants.sql
-- Security hardening: lock down EXECUTE on every database function so each is
-- callable only by the role that legitimately needs it.
--
-- WHY THIS IS NEEDED: in PostgreSQL, a newly created function grants EXECUTE to
-- PUBLIC by default — and Supabase exposes every public-schema function over
-- HTTP (PostgREST `/rest/v1/rpc/<fn>`). So without explicit revokes, any logged
-- in user (the `authenticated` role) — or even `anon` — can call these functions
-- directly from the browser. For SECURITY DEFINER functions (which bypass RLS)
-- that take an arbitrary user/id argument or return platform-wide data, that is
-- an IDOR / information-disclosure hole.
--
-- The block below revokes the default/explicit public grants and re-grants each
-- function to exactly the role that calls it. It is RESILIENT: a function that
-- isn't present in this database is skipped (with a NOTICE) instead of aborting
-- the migration — so it's safe to run even if some earlier migration that
-- creates a function hasn't been applied here yet. (If a function you expect IS
-- skipped, that means it's missing in this DB and you should apply the migration
-- that creates it — e.g. get_conversation_previews comes from migration 013.)

DO $$
DECLARE
  fn text;

  -- GROUP A — Server-only SECURITY DEFINER RPCs. Invoked ONLY from API routes
  -- via the service client (verified: no client/browser .rpc() calls reference
  -- them). They bypass RLS and trust their arguments, so the server (which first
  -- verifies the user's JWT) must be the only caller. Lock to service_role.
  server_only text[] := ARRAY[
    'public.get_user_conversations(uuid)',
    'public.get_conversation_previews(uuid, uuid[])',
    'public.get_conversation_messages(uuid, uuid, integer, timestamptz, boolean)',
    'public.admin_platform_stats()',
    'public.admin_daily_trend(integer)',
    'public.admin_developer_stats()',
    'public.admin_top_api_consumers(integer, integer)',
    'public.admin_analytics_overview()',
    'public.cleanup_expired_oauth_tokens()'
  ];

  -- GROUP B — Trigger functions (defense-in-depth). These RETURN trigger and
  -- therefore CANNOT be invoked via PostgREST rpc, and a trigger fires
  -- regardless of the invoking role's EXECUTE privilege. Revoking the default
  -- PUBLIC grant changes no runtime behavior; it just removes a pointless
  -- exposure. No re-grant needed — triggers run as the function owner.
  trigger_fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.update_conversation_timestamp()',
    'public.update_updated_at()',
    'public.cleanup_stale_sessions()'
  ];
BEGIN
  FOREACH fn IN ARRAY server_only LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    ELSE
      RAISE NOTICE 'Skipping missing function (apply the migration that creates it): %', fn;
    END IF;
  END LOOP;

  FOREACH fn IN ARRAY trigger_fns LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    ELSE
      RAISE NOTICE 'Skipping missing function: %', fn;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- GROUP C — RLS helper functions: INTENTIONALLY LEFT OPEN to authenticated.
--
-- public.is_conversation_member(uuid), public.is_conversation_admin(uuid),
-- public.is_admin()
--
-- These are referenced inside RLS USING() policies (see 009, 014, 015, 018) and
-- are evaluated by Supabase Realtime's apply_rls for the `authenticated` (and
-- possibly `anon`) role. Revoking their grants would break row-level security
-- and realtime subscriptions on conversation_members/messages.
--
-- They are safe to leave callable: each is keyed to auth.uid(), so a direct call
-- can only reveal the CALLER's own membership/admin status — never another
-- user's data. We therefore deliberately do NOT change their grants.
-- ============================================================================
