-- Storage buckets used by chat file/media uploads and avatars.
-- These were previously created manually in the Supabase dashboard (the
-- statements in 001_initial_schema.sql were left commented out), which meant a
-- fresh project had no buckets and /api/upload failed with "Bucket not found".
-- This migration makes them reproducible. Public read is required because the
-- app serves files via storage.getPublicUrl().

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('chat-files', 'chat-files', true, 10485760),      -- 10 MB
  ('profile-avatars', 'profile-avatars', true, 3145728), -- 3 MB
  ('group-avatars', 'group-avatars', true, 3145728)      -- 3 MB
ON CONFLICT (id) DO NOTHING;
