export { PHONE_PREFIX, isValidPhone, sanitizeLocalPart, toE164 } from '@chakyruu/shared';

/**
 * Only allow redirects to paths inside this app, never `//evil.com` or absolute URLs
 * (prevents an open redirect through `/login?next=`).
 */
export function safeNextPath(next: string | null, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
