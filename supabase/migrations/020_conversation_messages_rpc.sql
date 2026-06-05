-- 020_conversation_messages_rpc.sql
-- Collapses the GET /api/conversations/[id]/messages read path into ONE call.
--
-- Before, that route ran ~6 serial round-trips on initial load:
--   1. fetch the message page (sender + reactions + files)
--   2. fetch reply + forwarded source messages (batched pair)
--   3. read the user's own read_receipt (for unread baseline)
--   4. COUNT unread messages
--   5. upsert the user's read_receipt (mark read/delivered)
--   6. fetch OTHER members' read_receipts (status indicators)
--
-- This function returns the fully-enriched message page, the unread count
-- (computed BEFORE marking read), and the other members' receipts — and it
-- performs the read-receipt upsert as a side effect — all in a single DB call.
--
-- The JSON shapes match the old PostgREST select + JS enrichment EXACTLY so the
-- route and frontend need no shape changes:
--   * each message: all columns + sender + reactions[] + files[] (sorted by
--     display_order) + reply_message (key always present when reply_to is set,
--     null if the source is gone) + forwarded_message (key only when the source
--     still exists).
--
-- VOLATILE + SECURITY DEFINER because it writes (the upsert) and must bypass the
-- recursive RLS policy, exactly like the old service-client path. EXECUTE is
-- granted ONLY to service_role: this function trusts its p_user_id argument and
-- is meant to be called from the server route (which uses the service client),
-- never directly by end-user (anon/authenticated) PostgREST requests.

CREATE OR REPLACE FUNCTION public.get_conversation_messages(
  p_conversation_id uuid,
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_cursor timestamptz DEFAULT NULL,
  p_mark_read boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages jsonb;
  v_msg_count integer;
  v_newest_id uuid;
  v_last_read_at timestamptz;
  v_unread_count bigint := 0;
  v_other_receipts jsonb;
BEGIN
  -- 1) The page of messages (newest-first), each enriched like the old query.
  SELECT COALESCE(jsonb_agg(e.enriched ORDER BY e.created_at DESC), '[]'::jsonb)
  INTO v_messages
  FROM (
    SELECT
      m.created_at,
      to_jsonb(m)
      || jsonb_build_object(
           'sender',
           (SELECT jsonb_build_object(
              'id', pr.id, 'username', pr.username,
              'first_name', pr.first_name, 'last_name', pr.last_name,
              'avatar_url', pr.avatar_url, 'is_online', pr.is_online)
            FROM profiles pr WHERE pr.id = m.sender_id)
         )
      || jsonb_build_object(
           'reactions',
           COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'id', r.id, 'user_id', r.user_id, 'reaction', r.reaction))
            FROM message_reactions r WHERE r.message_id = m.id), '[]'::jsonb)
         )
      || jsonb_build_object(
           'files',
           COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'id', f.id, 'file_url', f.file_url, 'file_name', f.file_name,
              'file_size', f.file_size, 'file_type', f.file_type,
              'mime_type', f.mime_type, 'display_order', f.display_order)
              ORDER BY f.display_order)
            FROM message_files f WHERE f.message_id = m.id), '[]'::jsonb)
         )
      || CASE WHEN m.reply_to IS NOT NULL THEN
           jsonb_build_object('reply_message',
             (SELECT jsonb_build_object(
                'id', rm.id, 'content', rm.content,
                'message_type', rm.message_type, 'sender_id', rm.sender_id,
                'sender', (SELECT jsonb_build_object(
                   'id', rp.id, 'username', rp.username,
                   'first_name', rp.first_name, 'last_name', rp.last_name,
                   'avatar_url', rp.avatar_url)
                 FROM profiles rp WHERE rp.id = rm.sender_id))
              FROM messages rm WHERE rm.id = m.reply_to))
         ELSE '{}'::jsonb END
      || CASE WHEN m.forwarded_from IS NOT NULL THEN
           COALESCE(
             (SELECT jsonb_build_object('forwarded_message',
                jsonb_build_object(
                  'id', fm.id, 'content', fm.content,
                  'message_type', fm.message_type, 'sender_id', fm.sender_id,
                  'created_at', fm.created_at,
                  'sender', (SELECT jsonb_build_object(
                     'id', fp.id, 'username', fp.username,
                     'first_name', fp.first_name, 'last_name', fp.last_name,
                     'avatar_url', fp.avatar_url)
                   FROM profiles fp WHERE fp.id = fm.sender_id)))
              FROM messages fm WHERE fm.id = m.forwarded_from),
             '{}'::jsonb)
         ELSE '{}'::jsonb END
      AS enriched
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
      AND (p_cursor IS NULL OR m.created_at < p_cursor)
    ORDER BY m.created_at DESC
    LIMIT p_limit
  ) e;

  v_msg_count := jsonb_array_length(v_messages);
  v_newest_id := (v_messages -> 0 ->> 'id')::uuid;

  -- 2) Unread count — computed BEFORE marking read, initial load only (no cursor).
  --    COALESCE(..., -infinity) reproduces the old "never opened → count all
  --    messages from others" branch exactly.
  IF p_cursor IS NULL AND v_msg_count > 0 THEN
    SELECT rr.last_read_at INTO v_last_read_at
    FROM read_receipts rr
    WHERE rr.conversation_id = p_conversation_id
      AND rr.user_id = p_user_id;

    SELECT COUNT(*) INTO v_unread_count
    FROM messages msg
    WHERE msg.conversation_id = p_conversation_id
      AND msg.sender_id <> p_user_id
      AND msg.created_at > COALESCE(v_last_read_at, '-infinity'::timestamptz);
  END IF;

  -- 3) Mark read — matches old behavior (upsert whenever the page has rows).
  IF p_mark_read AND v_msg_count > 0 THEN
    INSERT INTO read_receipts (
      conversation_id, user_id, last_read_message_id, last_read_at, delivered_at
    ) VALUES (
      p_conversation_id, p_user_id, v_newest_id, now(), now()
    )
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET
      last_read_message_id = EXCLUDED.last_read_message_id,
      last_read_at = EXCLUDED.last_read_at,
      delivered_at = EXCLUDED.delivered_at;
  END IF;

  -- 4) Other members' receipts (for read/delivered status indicators).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', orr.user_id,
    'last_read_at', orr.last_read_at,
    'last_read_message_id', orr.last_read_message_id,
    'delivered_at', orr.delivered_at)), '[]'::jsonb)
  INTO v_other_receipts
  FROM read_receipts orr
  WHERE orr.conversation_id = p_conversation_id
    AND orr.user_id <> p_user_id;

  RETURN jsonb_build_object(
    'messages', v_messages,
    'unread_count', v_unread_count,
    'other_read_receipts', v_other_receipts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid, uuid, integer, timestamptz, boolean)
  TO service_role;
