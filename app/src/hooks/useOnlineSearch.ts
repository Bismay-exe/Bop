import { useEffect, useRef, useState } from 'react';
import { Song } from '../types';
import { searchTab } from '../services/api/endpoints';
import { ApiRequestError } from '../services/api/client';

export interface OnlineSearchState {
  results: Song[];
  loading: boolean;
  error: string | null;
}

/**
 * Debounced online search against the backend. Cancels the previous request
 * when the query changes (AbortController), so rapid typing doesn't pile up
 * yt-music calls. Returns the `songs` slice of the `top` tab.
 */
export function useOnlineSearch(query: string, debounceMs = 350): OnlineSearchState {
  const [state, setState] = useState<OnlineSearchState>({
    results: [],
    loading: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    // Cancel any in-flight request on query change/unmount.
    abortRef.current?.abort();

    if (trimmed.length < 2) {
      setState({ results: [], loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState((s) => ({ ...s, loading: true, error: null }));

    const handle = setTimeout(async () => {
      try {
        const results = await searchTab(trimmed, 'top', 20, controller.signal);
        if (!controller.signal.aborted) {
          setState({ results, loading: false, error: null });
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        const msg = e instanceof ApiRequestError ? e.message : 'Search failed';
        setState({ results: [], loading: false, error: msg });
      }
    }, debounceMs);

    return () => clearTimeout(handle);
  }, [query, debounceMs]);

  return state;
}
