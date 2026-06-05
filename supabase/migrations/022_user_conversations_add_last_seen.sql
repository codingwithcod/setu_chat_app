-- 022_user_conversations_add_last_seen.sql
-- Adds `last_seen` to the member profiles returned by get_user_conversations.
--
-- WHY: the chat page now renders the conversation header instantly from the
-- cached conversation list (stale-while-revalidate) instead of waiting on
-- GET /api/conversations/[id]. The header shows "Last seen <time>" for private
-- chats (ChatHeader reads otherProfile.last_seen), but the list RPC didn't
-- include last_seen — so without this the cached header would briefly miss it.
-- Including last_seen makes the cached copy complete, matching what the
-- /api/conversations/[id] route returns.
--
-- Only change vs migration 019: 'last_seen' added to the profile json object.
-- Everything else (shape, ordering, RLS-bypass, grants) is identical.

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
              'is_online', p.is_online,
              'last_seen', p.last_seen
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
  ORDER BY c.last_message_at DESC;
$$;

-- Re-assert the locked-down grant (migration 021): server-only.
REVOKE EXECUTE ON FUNCTION public.get_user_conversations(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid)
  TO service_role;
