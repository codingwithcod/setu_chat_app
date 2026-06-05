-- 024_get_or_create_private_conversation_rpc.sql
-- Kills the N+1 in POST /api/conversations for private chats.
--
-- Before, opening/starting a DM checked for an existing private conversation
-- with a loop over EVERY conversation the user belongs to — 2 queries per
-- conversation (is it private? is the other user in it?). A user in N chats paid
-- ~2N serial round-trips just to answer "do we already have a DM?", before
-- creating anything. This is a hot path (message-from-search / suggested users).
--
-- This function answers get-or-create in ONE call: find the existing private
-- conversation that contains BOTH users; if none, create it (type 'private',
-- created_by = caller, both members role 'member') — then return the full
-- conversation in the exact shape the route returned, plus an `existing` flag so
-- the route can keep its 200-vs-201 status and the `existing: true` field.
--
-- Behavior preserved exactly:
--   * existing private conv found  → { conversation, existing: true }  (route: 200, existing:true)
--   * created                      → { conversation, existing: false } (route: 201)
--   * full conversation shape matches the old select (members + profile with
--     id/username/first_name/last_name/avatar_url/is_online — no last_seen, same
--     as the old POST select).
--   * both members inserted with role 'member' (mirrors the old create path for
--     a private chat).
--
-- VOLATILE + SECURITY DEFINER (writes + bypasses RLS like the old service-client
-- path). EXECUTE granted to service_role only (server-only route), per 021.

CREATE OR REPLACE FUNCTION public.get_or_create_private_conversation(
  p_user_id uuid,
  p_other_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_existing boolean := false;
  v_conversation jsonb;
BEGIN
  -- 1) Find an existing private conversation containing BOTH users.
  SELECT c.id INTO v_conv_id
  FROM public.conversations c
  WHERE c.type = 'private'
    AND EXISTS (
      SELECT 1 FROM public.conversation_members m1
      WHERE m1.conversation_id = c.id AND m1.user_id = p_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_members m2
      WHERE m2.conversation_id = c.id AND m2.user_id = p_other_user_id
    )
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    v_existing := true;
  ELSE
    -- 2) Create it (mirrors the old route's create path for a private chat).
    INSERT INTO public.conversations (type, name, description, created_by)
    VALUES ('private', NULL, NULL, p_user_id)
    RETURNING id INTO v_conv_id;

    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conv_id, p_user_id, 'member'),
      (v_conv_id, p_other_user_id, 'member');
  END IF;

  -- 3) Build the full conversation in the same shape the route returned.
  SELECT to_jsonb(c) || jsonb_build_object(
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
  INTO v_conversation
  FROM public.conversations c
  WHERE c.id = v_conv_id;

  RETURN jsonb_build_object(
    'conversation', v_conversation,
    'existing', v_existing
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_private_conversation(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_private_conversation(uuid, uuid)
  TO service_role;
