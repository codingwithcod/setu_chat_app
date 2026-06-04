-- 013_conversation_previews_rpc.sql
-- Batches the conversation-list "last message + unread count" lookup.
--
-- Before: GET /api/conversations ran 3 queries PER conversation (last message,
-- read receipt, unread count) — a classic N+1 (3N round-trips). This function
-- returns, for every conversation id passed in, the latest message (with its
-- sender) and the user's unread count, in a SINGLE database call.
--
-- The API route falls back to the old per-conversation logic if this function
-- is absent, so deploying the code before applying this migration is safe.

CREATE OR REPLACE FUNCTION public.get_conversation_previews(
  p_user_id uuid,
  p_conversation_ids uuid[]
)
RETURNS TABLE (
  conversation_id uuid,
  last_message jsonb,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ids AS (
    SELECT unnest(p_conversation_ids) AS conversation_id
  ),
  -- Latest message per conversation (DISTINCT ON = one row per group).
  last_msg AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      to_jsonb(m) || jsonb_build_object(
        'sender',
        CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'avatar_url', p.avatar_url
        ) END
      ) AS last_message
    FROM public.messages m
    LEFT JOIN public.profiles p ON p.id = m.sender_id
    WHERE m.conversation_id = ANY(p_conversation_ids)
    ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT
    ids.conversation_id,
    lm.last_message,
    -- Unread = messages from OTHERS newer than the user's last_read_at.
    -- COALESCE(..., -infinity) makes "never opened" count all such messages,
    -- matching the original two-branch logic exactly.
    COALESCE((
      SELECT COUNT(*)
      FROM public.messages msg
      WHERE msg.conversation_id = ids.conversation_id
        AND msg.sender_id <> p_user_id
        AND msg.created_at > COALESCE(
          (SELECT rr.last_read_at
             FROM public.read_receipts rr
            WHERE rr.conversation_id = ids.conversation_id
              AND rr.user_id = p_user_id),
          '-infinity'::timestamptz
        )
    ), 0) AS unread_count
  FROM ids
  LEFT JOIN last_msg lm ON lm.conversation_id = ids.conversation_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_previews(uuid, uuid[])
  TO anon, authenticated, service_role;
