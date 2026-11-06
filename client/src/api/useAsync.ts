import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T };

/** Runs `load` whenever its identity changes; returns the state plus a manual reload. */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    load()
      .then((data) => !cancelled && setState({ status: 'success', data }))
      .catch((error: unknown) => !cancelled && setState({ status: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
