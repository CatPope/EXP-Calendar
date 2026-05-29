"use client";

import { useCallback, useEffect, useState } from "react";
import { humanizeError } from "../api";

export interface UseAsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Clear the error message without re-fetching (parity with previous `setErr("")`). */
  dismissError: () => void;
}

/**
 * Generic async data loader.
 *
 * Wraps the common `useState(loading) + useState(err) + useEffect(...)` pattern.
 * - Re-runs when any element of `deps` changes (use stable refs / primitives).
 * - `reload()` triggers a manual re-fetch (e.g. after a mutation).
 * - `dismissError()` clears the banner without re-fetching.
 * - Error messages are pre-humanized via `humanizeError`.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const dismissError = useCallback(() => setError(null), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(humanizeError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload, dismissError };
}
