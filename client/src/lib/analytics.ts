import { isReservedSlug } from '@chakyruu/shared';

/** Product events (Umami). Never with names, phones or tokens. */
export type AnalyticsEvent = 'create_started' | 'published' | 'guest_opened' | 'guest_rsvp' | 'partner_lead';
type EventData = Readonly<Record<string, string | number | boolean>>;

interface Umami {
  track(event: string, data?: EventData): void;
}

declare global {
  interface Window {
    umami?: Umami;
    chakyruuBeforeSend?: (type: string, payload: Record<string, unknown>) => Record<string, unknown>;
  }
}

/**
 * Invitation slugs are host names ("/aibek-aizada"), ids in /create/:id are private: both are
 * replaced before a pageview leaves the browser. App routes stay as they are.
 */
export function maskPath(url: string): string {
  const [path = '/', ...rest] = url.split(/(?=[?#])/);
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return url;
  const [first = '', ...others] = segments;
  const head = isReservedSlug(first) ? first : ':slug';
  const masked = `/${[head, ...others.map(() => ':id')].join('/')}`;
  return [masked, ...rest].join('');
}

function maskUrl(value: unknown): unknown {
  if (typeof value !== 'string' || value === '') return value;
  try {
    const parsed = new URL(value, window.location.origin);
    // Other sites' referrers stay; only our own paths are masked.
    if (parsed.origin !== window.location.origin) return parsed.origin;
    return maskPath(parsed.pathname);
  } catch {
    return maskPath(value);
  }
}

/** Called by the Umami script for every pageview/event (data-before-send). */
export function beforeSend(_type: string, payload: Record<string, unknown>): Record<string, unknown> {
  return { ...payload, url: maskUrl(payload.url), referrer: maskUrl(payload.referrer) };
}

export function installAnalytics(): void {
  window.chakyruuBeforeSend = beforeSend;
}

/** The Umami script is deferred: early events (guest_opened) wait for it this long, then are dropped. */
const WAIT_STEP_MS = 500;
const MAX_WAIT_STEPS = 20;
let pending: { event: AnalyticsEvent; data?: EventData }[] = [];
let isWaiting = false;

function send(event: AnalyticsEvent, data?: EventData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    // Analytics must never break the page.
  }
}

function flushWhenLoaded(step = 0): void {
  if (window.umami) {
    const queued = pending;
    pending = [];
    isWaiting = false;
    queued.forEach(({ event, data }) => send(event, data));
    return;
  }
  if (step >= MAX_WAIT_STEPS) {
    // Analytics is off or blocked.
    pending = [];
    isWaiting = false;
    return;
  }
  window.setTimeout(() => flushWhenLoaded(step + 1), WAIT_STEP_MS);
}

/** Sends at once when Umami is loaded, otherwise queues briefly; a no-op when analytics is off. */
export function track(event: AnalyticsEvent, data?: EventData): void {
  if (window.umami) {
    send(event, data);
    return;
  }
  pending = [...pending, { event, data }];
  if (!isWaiting) {
    isWaiting = true;
    flushWhenLoaded();
  }
}

/** Like track(), but once per key in this browser session (a payment result page can be reloaded). */
export function trackOnce(key: string, event: AnalyticsEvent, data?: EventData): void {
  const storageKey = `tracked:${key}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
  } catch {
    // Private mode without storage: send anyway.
  }
  track(event, data);
}
