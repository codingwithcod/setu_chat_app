-- 012_performance_indexes.sql
-- Performance indexes for foreign keys that were previously unindexed.
--
-- Context: most hot-path lookups are ALREADY indexed — either by explicit
-- indexes (e.g. idx_messages_conversation on messages(conversation_id,
-- created_at DESC)) or implicitly by UNIQUE constraints (read_receipts,
-- message_reactions, pinned_messages all have UNIQUE(...) that Postgres backs
-- with a composite btree index). So we deliberately do NOT add redundant
-- indexes there.
--
-- The real gap: messages.reply_to and messages.forwarded_from are
-- self-referencing foreign keys with ON DELETE SET NULL, but neither was
-- indexed. Deleting ANY message forces Postgres to full-scan the messages
-- table to find rows referencing it. These partial indexes fix that and also
-- speed up "find replies/forwards of this message" lookups. Partial (WHERE NOT
-- NULL) keeps them tiny since most messages are neither replies nor forwards.
--
-- NOTE: for a very large messages table in production, run these manually as
-- CREATE INDEX CONCURRENTLY (outside a transaction) to avoid locking writes.

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON public.messages(reply_to)
  WHERE reply_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_forwarded_from
  ON public.messages(forwarded_from)
  WHERE forwarded_from IS NOT NULL;

-- Lets Postgres return a message's files already ordered by display_order
-- instead of fetching by message_id then sorting. Minor, but harmless.
CREATE INDEX IF NOT EXISTS idx_message_files_message_order
  ON public.message_files(message_id, display_order);
