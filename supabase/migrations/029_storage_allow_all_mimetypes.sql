-- Remove the MIME-type restriction on the chat-files bucket.
-- Validation is already handled at the application layer by
-- file-validation.ts (type + size check) and safeUploadContentType()
-- (neutralises dangerous files to text/plain before storage).
-- The bucket-level restriction was blocking newly supported file types
-- (audio, code/text files, etc.) that the app now accepts.

UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'chat-files';
