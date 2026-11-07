import { EVENT_TIME_ZONE } from '@chakyruu/shared';

export { EVENT_TIME_ZONE, formatEventDate, formatEventTime, type FormattedEventDate } from '@chakyruu/shared';

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: EVENT_TIME_ZONE,
  }).format(new Date(iso));
}

/** Same-site absolute path ("/uploads/x.png"), but not protocol-relative "//host" or "/\host". */
const SAME_SITE_PATH = /^\/(?![/\\])/;

/**
 * Returns the URL only if it uses http(s) or is a same-site path (uploaded photos);
 * blocks `javascript:` / `data:` injection in href/src.
 */
export function safeUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (SAME_SITE_PATH.test(url)) return url;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}
