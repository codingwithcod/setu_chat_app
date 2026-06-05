-- 019_user_conversations_rpc.sql
-- Merges the conversation-list fetch into ONE database call.
--
-- Before: GET /api/conversations ran two serial queries — (1) read the user's
-- conversation_members rows to get their conversation ids, then (2) fetch those
-- conversations with their members + member profiles nested. Two round-trips.
--
-- This function does both in a single call: for the given user it returns every
-- non-deleted conversation they belong to, ordered by last_message_at DESC, each
-- as a jsonb object shaped EXACTLY like the old PostgREST nested select
-- (`*, members:conversation_members(*, profile:profiles(...))`) so the API route
-- and frontend need no shape changes.
--
-- SECURITY DEFINER so it bypasses the recursive RLS policy on
-- conversation_members, matching the old service-client behavior.

CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id uuid)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_jsonb(c) || jsonb_build_object(
      'members',
      COALESCE((
        SELECT jsonb_agg(
          to_jsonb(cm) || jsonb_build_object(
            'profile',
            CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', p.id,
              'username', p.username,
              'first_name', p.first_name,
              'last_name', p.last_name,
              'avatar_url', p.avatar_url,
              'is_online', p.is_online
            ) END
          )
        )
        FROM public.conversation_members cm
        LEFT JOIN public.profiles p ON p.id = cm.user_id
        WHERE cm.conversation_id = c.id
      ), '[]'::jsonb)
    )
  FROM public.conversations c
  WHERE EXISTS (
    SELECT 1
    FROM public.conversation_members me
    WHERE me.conversation_id = c.id
      AND me.user_id = p_user_id
  )
  AND (c.is_deleted IS NULL OR c.is_deleted = false)
  -- Matches the old `.order("last_message_at", { ascending: false })` exactly
  -- (Postgres DESC defaults to NULLS FIRST, same as PostgREST did).
  ORDER BY c.last_message_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid)
  TO anon, authenticated, service_role;
