import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for debouncing values
 * Useful for search inputs and API calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls
 * Useful for scroll handlers and resize events
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args: unknown[]) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook for lazy initialization
 * Useful for expensive computations that shouldn't run on every render
 */
export function useLazyInit<T>(initializer: () => T): T {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = initializer();
  }

  return ref.current;
}

/**
 * Hook for caching async data
 */
export function useAsyncCache<T, K extends string | number>(
  key: K,
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const cache = useRef<Map<K, T>>(new Map());
  const loading = useRef(false);
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: cache.current.get(key) || null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const cached = cache.current.get(key);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    if (loading.current) return;
    loading.current = true;
    setState((s) => ({ ...s, loading: true }));

    fetcher()
      .then((data) => {
        cache.current.set(key, data);
        setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        setState({ data: null, loading: false, error });
      })
      .finally(() => {
        loading.current = false;
      });
  }, [key, ...deps]);

  return state;
}

/**
 * Hook for managing intervals with proper cleanup
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Hook for creating a persistent callback ref
 * Useful for event listeners that need to access latest callback
 */
export function useCallbackRef<T extends (...args: unknown[]) => unknown>(
  callback: T | null
): React.MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  return ref;
}
