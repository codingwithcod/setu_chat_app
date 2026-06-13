import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import type { MessageFile } from '@/types';

/** A shared attachment plus the name of whoever sent it. */
export type SharedAttachment = MessageFile & { sender_name: string };

/**
 * Fetch every attachment shared in a conversation (newest first), powering the
 * Photos / Files tabs. Mirrors the web `useConversationFiles` and hits the same
 * Bearer-ready `/api/conversations/:id/files` route.
 */
export function useConversationFiles(conversationId: string | null | undefined) {
  const [files, setFiles] = useState<SharedAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!conversationId) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<SharedAttachment[]>(
        `/api/conversations/${conversationId}/files`,
      );
      setFiles(data ?? []);
    } catch (err) {
      console.error('Failed to load shared files:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  return { files, loading, refetch: load };
}
