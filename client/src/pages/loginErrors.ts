import { ApiError } from '../api/client';
import type { Dict } from '../i18n/dict';

/** Message under the phone field when asking for a login code fails. */
export function requestErrorMessage(error: unknown, t: Dict): string {
  if (!(error instanceof ApiError)) return t.errorGeneric;
  if (error.status === 400) return t.errorPhone;
  if (error.status === 429) return t.errorTooMany;
  // 503: the SMS gateway refused or was unreachable (the server logs why).
  if (error.status === 503) return t.errorSmsFailed;
  return t.errorGeneric;
}

/** Message under the code field when checking the code fails. */
export function verifyErrorMessage(error: unknown, t: Dict): string {
  if (!(error instanceof ApiError)) return t.errorGeneric;
  if (error.status === 400) return t.errorCode;
  if (error.status === 429) return t.errorTooManyAttempts;
  return t.errorGeneric;
}
