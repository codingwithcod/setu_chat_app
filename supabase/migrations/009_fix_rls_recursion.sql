-- ============================================
-- Fix: Infinite recursion in conversation_members RLS
-- The SELECT/DELETE policies on conversation_members
-- reference the same table, causing infinite recursion
-- in Supabase Realtime's apply_rls function.
-- Fix: Use SECURITY DEFINER helper functions to bypass
-- RLS within the policy check itself.
-- ============================================

-- Helper: Check if current user is a member of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Check if current user is an admin of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_admin(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Replace the recursive SELECT policy
DROP POLICY IF EXISTS "Members can view members" ON public.conversation_members;
CREATE POLICY "Members can view members" ON public.conversation_members
  FOR SELECT USING (public.is_conversation_member(conversation_id));

-- Replace the recursive DELETE policy
DROP POLICY IF EXISTS "Admins can remove members" ON public.conversation_members;
CREATE POLICY "Admins can remove members" ON public.conversation_members
  FOR DELETE USING (public.is_conversation_admin(conversation_id) OR user_id = auth.uid());
