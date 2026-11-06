import type { InvitationDraftInput } from '@chakyruu/shared';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const AUTOSAVE_INTERVAL_MS = 5000;

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface Options<T> {
  save: (patch: InvitationDraftInput) => Promise<T>;
  onSaved: (result: T) => void;
  intervalMs?: number;
}

export interface Autosave {
  status: SaveStatus;
  /** Queue changed fields; they are merged and sent on the next tick. */
  enqueue: (patch: InvitationDraftInput) => void;
  /** Send whatever is queued right now (e.g. before publishing). */
  flush: () => Promise<void>;
}

const isEmpty = (patch: InvitationDraftInput): boolean => Object.keys(patch).length === 0;

/**
 * Collects field changes and saves them every `intervalMs`, one request at a time.
 * A failed patch is re-queued under newer edits so nothing typed is lost.
 */
export function useAutosave<T>({ save, onSaved, intervalMs = AUTOSAVE_INTERVAL_MS }: Options<T>): Autosave {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const pending = useRef<InvitationDraftInput>({});
  const inFlight = useRef<Promise<void> | null>(null);
  const callbacks = useRef({ save, onSaved });
  useLayoutEffect(() => {
    callbacks.current = { save, onSaved };
  });

  const flush = useCallback(async (): Promise<void> => {
    if (inFlight.current) await inFlight.current;
    const patch = pending.current;
    if (isEmpty(patch)) return;
    pending.current = {};
    setStatus('saving');

    const run = callbacks.current
      .save(patch)
      .then((result) => {
        callbacks.current.onSaved(result);
        setStatus(isEmpty(pending.current) ? 'saved' : 'dirty');
      })
      .catch(() => {
        pending.current = { ...patch, ...pending.current };
        setStatus('error');
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    await run;
  }, []);

  const enqueue = useCallback((patch: InvitationDraftInput) => {
    pending.current = { ...pending.current, ...patch };
    setStatus('dirty');
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void flush(), intervalMs);
    return () => {
      window.clearInterval(id);
      void flush(); // leaving the builder inside the SPA: save what is left
    };
  }, [flush, intervalMs]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isEmpty(pending.current) && !inFlight.current) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { status, enqueue, flush };
}
