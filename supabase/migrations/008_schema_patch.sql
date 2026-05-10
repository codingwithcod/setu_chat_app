-- ============================================
-- Schema Patch: Add missing columns
-- Adds columns that were added after initial migration
-- Safe to re-run (uses IF NOT EXISTS)
-- ============================================

-- Add is_deleted to conversations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add delivered_at to read_receipts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'read_receipts' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.read_receipts ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add auth_providers array to profiles (if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'auth_providers'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN auth_providers TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Enable realtime for read_receipts (if not already)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'read_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.read_receipts;
  END IF;
END $$;
