-- 023_suggested_users_rpc.sql
-- Collapses GET /api/users/suggested from 4 serial round-trips into ONE call.
--
-- Before, the route ran sequentially: (1) my conversation_members → my conv ids,
-- (2) filter to type='private', (3) the other members of those private convs
-- (my existing contacts), (4) top-5 recently-active profiles excluding self +
-- those contacts. Each step waited on the previous one.
--
-- This function expresses the whole thing as a single query: the 5 most recently
-- active users who have a username, are not me, and don't already share a
-- PRIVATE conversation with me. The exclusion (steps 1-3) is a NOT EXISTS
-- subquery. Behavior is identical to the old route:
--   * excludes self + private-chat contacts (group co-members stay eligible,
--     exactly as before),
--   * username IS NOT NULL,
--   * ORDER BY last_seen DESC NULLS LAST (matches nullsFirst:false),
--   * same 5 fields, same default limit of 5.
--
-- SECURITY DEFINER to bypass RLS like the old service-client path; EXECUTE
-- granted to service_role only (server-only route), consistent with migration 021.

CREATE OR REPLACE FUNCTION public.get_suggested_users(
  p_user_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'is_online', p.is_online,
    'last_seen', p.last_seen
  )
  FROM public.profiles p
  WHERE p.id <> p_user_id
    AND p.username IS NOT NULL
    -- Exclude users I already share a PRIVATE conversation with.
    AND NOT EXISTS (
      SELECT 1
      FROM public.conversation_members mine
      JOIN public.conversations c
        ON c.id = mine.conversation_id AND c.type = 'private'
      JOIN public.conversation_members other
        ON other.conversation_id = c.id AND other.user_id = p.id
      WHERE mine.user_id = p_user_id
    )
  ORDER BY p.last_seen DESC NULLS LAST
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_suggested_users(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_suggested_users(uuid, integer)
  TO service_role;
