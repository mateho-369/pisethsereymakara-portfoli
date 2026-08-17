import { useCallback, useEffect, useState } from 'react';

/**
 * The fetch → loading → error → reload cycle every panel repeats, in one place.
 * `reload` is safe to call after any mutation to re-sync with the server.
 */
export function useResource<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const next = await loader();
      setError('');
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => { reload(); }, [reload]);

  return { data, setData, loading, error, setError, reload };
}
