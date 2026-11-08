import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T };

/**
 * Runs `load` whenever its identity changes; returns the state plus a manual reload.
 * `initial` (data the server rendered the page with) is shown at once and the first load is skipped.
 */
export function useAsync<T>(load: () => Promise<T>, initial?: T): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>(() => (initial === undefined ? { status: 'loading' } : { status: 'success', data: initial }));
  const [attempt, setAttempt] = useState(0);
  const skipFirstLoad = useRef(initial !== undefined);

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      return undefined;
    }
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
