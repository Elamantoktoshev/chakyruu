import { ApiError } from '../../api/client';

/** Server messages are shown as they are (e.g. "The cover must be 9:16 …"); anything else is generic. */
export function adminErrorText(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.status < 500 ? error.message : fallback;
}
