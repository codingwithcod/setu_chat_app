-- ============================================
-- MESSAGE FILES TABLE (multi-file support)
-- ============================================

CREATE TABLE public.message_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'file')),
  mime_type TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_files_message ON public.message_files(message_id);

-- ============================================
-- Drop old single-file columns (dev mode)
-- ============================================
ALTER TABLE public.messages DROP COLUMN IF EXISTS file_url;
ALTER TABLE public.messages DROP COLUMN IF EXISTS file_name;
ALTER TABLE public.messages DROP COLUMN IF EXISTS file_size;

-- ============================================
-- Update message_type constraint (add video/audio)
-- ============================================
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'file', 'video', 'audio', 'system'));

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE public.message_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view message files" ON public.message_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert message files" ON public.message_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
