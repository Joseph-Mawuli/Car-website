import { useCallback, useEffect, useRef, useState } from 'react';

export interface QueryState<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  reload: () => void;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * Minimal data-fetching hook: cancels stale requests when the key changes and
 * keeps the previous data visible while refetching to avoid layout jumps.
 */
export function useQuery<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
): QueryState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [settled, setSettled] = useState<{ requestId: string; error: unknown } | null>(null);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  const requestId = `${key}#${nonce}`;

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (key === null) return;
    const id = `${key}#${nonce}`;
    const controller = new AbortController();
    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDataState(result);
        setSettled({ requestId: id, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
        setSettled({ requestId: id, error: err });
      });
    return () => controller.abort();
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof updater === 'function' ? (updater as (p: T | undefined) => T)(prev) : updater));
  }, []);

  const isCurrent = settled?.requestId === requestId;
  return {
    data,
    error: isCurrent ? settled.error : null,
    isLoading: key !== null && !isCurrent,
    reload,
    setData,
  };
}
