import { useState } from 'react';
import { ApiError } from '../../api/client';

export type SaveState = { status: 'idle' | 'saving' | 'saved' } | { status: 'error'; message: string };

/** Small helper for "Save" buttons: runs the request and keeps a status for the button label. */
export function useSaveState(errorText: (error: unknown) => string) {
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  async function run<T>(action: () => Promise<T>): Promise<T | null> {
    setState({ status: 'saving' });
    try {
      const result = await action();
      setState({ status: 'saved' });
      return result;
    } catch (error: unknown) {
      setState({ status: 'error', message: errorText(error) });
      return null;
    }
  }

  return { state, run };
}

/** Server validation errors (400) are shown as "check the fields", everything else as generic. */
export function isValidationError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400;
}
