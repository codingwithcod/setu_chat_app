-- 026_conversation_members_owner_role.sql
--
-- Fix: group creation fails with
--   new row for relation "conversation_members" violates check constraint
--   "conversation_members_role_check"
--
-- The original constraint (001_initial_schema.sql) only allowed
-- role IN ('admin', 'member'). However, group features insert the group
-- creator as the 'owner' role (see /api/conversations POST and the
-- conversations service), and ownership transfer / admin management all depend
-- on 'owner'. Inserting 'owner' therefore aborted the members insert, which —
-- because the conversation row is created in a separate prior step — left an
-- empty, member-less group behind (the orphan groups visible in the admin
-- panel). Widen the constraint so the schema matches the application's role
-- model: owner > admin > member.

ALTER TABLE public.conversation_members
  DROP CONSTRAINT IF EXISTS conversation_members_role_check;

ALTER TABLE public.conversation_members
  ADD CONSTRAINT conversation_members_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

-- Clean up the orphan groups produced by the failed attempts. This is scoped
-- strictly to GROUP conversations that have NO members at all — a real group
-- always has at least its creator, so this cannot remove a legitimate group.
-- (Such orphans also have no messages, since posting requires membership.)
DELETE FROM public.conversations c
WHERE c.type = 'group'
  AND NOT EXISTS (
    SELECT 1
    FROM public.conversation_members m
    WHERE m.conversation_id = c.id
  );
