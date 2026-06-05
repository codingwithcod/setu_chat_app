-- 025_forward_message_rpc.sql
-- Collapses POST /api/messages/forward into ONE call.
--
-- The route resolved/created a private conversation per target user (an N+1 on
-- the create path: insert conversation + insert members per new DM), then
-- inserted the forwarded message + copied files per target conversation, and
-- redundantly updated last_message_at (the on_new_message trigger already does
-- that). This function does the whole fan-out in a single DB round-trip.
--
-- Behavior preserved:
--   * targets = the given conversation ids + one private conversation per given
--     user id (existing DM reused; otherwise created with both members 'member'),
--   * a forwarded message is inserted into each target (sender = caller,
--     forwarded_from = original), original files are copied,
--   * CONTINUE-ON-ERROR per target/user (a single failure skips that one and
--     does not abort the rest) — mirrors the route's per-item try/continue,
--   * returns { data: [...messages with sender...], forwardedCount, errorCount }
--     so the route can keep its "0 succeeded but some errored → 500" rule,
--   * message-with-sender shape matches the old select (no files embedded in the
--     response, exactly as before),
--   * original message missing → { error: 'not_found' } (route maps to 404).
--
-- VOLATILE + SECURITY DEFINER (writes, bypasses RLS like the old service path).
-- EXECUTE granted to service_role only (server-only route), per migration 021.

CREATE OR REPLACE FUNCTION public.forward_message(
  p_user_id uuid,
  p_message_id uuid,
  p_conversation_ids uuid[] DEFAULT '{}',
  p_user_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content       text;
  v_message_type  text;
  v_found         boolean;
  v_target_ids    uuid[] := COALESCE(p_conversation_ids, '{}');
  v_uid           uuid;
  v_conv_id       uuid;
  v_new_msg_id    uuid;
  v_results       jsonb := '[]'::jsonb;
  v_error_count   integer := 0;
  v_msg           jsonb;
BEGIN
  -- 1) Original message (and the flag for "exists").
  SELECT m.content, m.message_type, true
    INTO v_content, v_message_type, v_found
  FROM public.messages m
  WHERE m.id = p_message_id;

  IF NOT COALESCE(v_found, false) THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- 2) Resolve/create a private conversation per target user.
  FOREACH v_uid IN ARRAY COALESCE(p_user_ids, '{}') LOOP
    BEGIN
      SELECT c.id INTO v_conv_id
      FROM public.conversations c
      WHERE c.type = 'private'
        AND EXISTS (SELECT 1 FROM public.conversation_members m1
                    WHERE m1.conversation_id = c.id AND m1.user_id = p_user_id)
        AND EXISTS (SELECT 1 FROM public.conversation_members m2
                    WHERE m2.conversation_id = c.id AND m2.user_id = v_uid)
      LIMIT 1;

      IF v_conv_id IS NULL THEN
        INSERT INTO public.conversations (type, created_by)
        VALUES ('private', p_user_id)
        RETURNING id INTO v_conv_id;

        INSERT INTO public.conversation_members (conversation_id, user_id, role)
        VALUES (v_conv_id, p_user_id, 'member'), (v_conv_id, v_uid, 'member');
      END IF;

      v_target_ids := array_append(v_target_ids, v_conv_id);
    EXCEPTION WHEN OTHERS THEN
      -- Skip this user (mirrors the route's `continue` on conv/member error).
      CONTINUE;
    END;
  END LOOP;

  -- 3) Insert the forwarded message into each target conversation + copy files.
  FOREACH v_conv_id IN ARRAY v_target_ids LOOP
    BEGIN
      INSERT INTO public.messages
        (conversation_id, sender_id, content, message_type, forwarded_from)
      VALUES
        (v_conv_id, p_user_id, v_content, COALESCE(v_message_type, 'text'), p_message_id)
      RETURNING id INTO v_new_msg_id;

      INSERT INTO public.message_files
        (message_id, file_url, file_name, file_size, file_type, mime_type, display_order)
      SELECT v_new_msg_id, f.file_url, f.file_name, f.file_size, f.file_type,
             f.mime_type, f.display_order
      FROM public.message_files f
      WHERE f.message_id = p_message_id;

      SELECT to_jsonb(m) || jsonb_build_object(
        'sender',
        (SELECT jsonb_build_object(
           'id', p.id, 'username', p.username, 'first_name', p.first_name,
           'last_name', p.last_name, 'avatar_url', p.avatar_url,
           'is_online', p.is_online)
         FROM public.profiles p WHERE p.id = m.sender_id)
      )
      INTO v_msg
      FROM public.messages m
      WHERE m.id = v_new_msg_id;

      v_results := v_results || jsonb_build_array(v_msg);
    EXCEPTION WHEN OTHERS THEN
      -- Mirrors the route recording an error for this conversation and moving on.
      v_error_count := v_error_count + 1;
      CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'data', v_results,
    'forwardedCount', jsonb_array_length(v_results),
    'errorCount', v_error_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.forward_message(uuid, uuid, uuid[], uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forward_message(uuid, uuid, uuid[], uuid[])
  TO service_role;
