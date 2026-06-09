import { useEffect, useRef, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { SearchResult } from '@/types';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 350;

interface SearchState {
  results: SearchResult[];
  loading: boolean;
  /** True once a query >= MIN_QUERY chars has been issued. */
  active: boolean;
}

/**
 * Debounced user search against GET /api/users/search?q=. Mirrors the web
 * UserSearch: min 2 chars, 350ms debounce, aborts the in-flight request when
 * the query changes.
 */
export function useUserSearch(query: string): SearchState {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    active: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    abortRef.current?.abort();

    if (q.length < MIN_QUERY) {
      setState({ results: [], loading: false, active: false });
      return;
    }

    setState((s) => ({ ...s, loading: true, active: true }));
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const results = await api.get<SearchResult[]>(
          `/api/users/search?q=${encodeURIComponent(q)}`,
          controller.signal
        );
        setState({ results: results ?? [], loading: false, active: true });
      } catch (err) {
        // Ignore aborts; surface nothing for transient errors (empty results).
        if (err instanceof ApiError || (err as Error)?.name !== 'AbortError') {
          setState({ results: [], loading: false, active: true });
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return state;
}

/** Suggested users to start chatting with (GET /api/users/suggested). */
export function useSuggestedUsers() {
  const [users, setUsers] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useRef(async () => {
    setLoading(true);
    try {
      const data = await api.get<SearchResult[]>('/api/users/suggested');
      setUsers(data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }).current;

  useEffect(() => {
    load();
  }, [load]);

  return { users, loading, reload: load };
}
