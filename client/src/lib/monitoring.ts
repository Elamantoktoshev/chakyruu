/**
 * Browser error tracking. The server puts the Sentry DSN into a <meta> tag only when SENTRY_DSN
 * is configured; without it nothing is loaded. @sentry/react is a separate lazy chunk.
 */
type CaptureFn = (error: unknown) => void;

let capture: CaptureFn | null = null;
const PHONE = /\+?996(\d{7})(\d{2})/g;

const meta = (name: string): string | undefined =>
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content || undefined;

export function maskPhones(text: string): string {
  return text.replace(PHONE, (_match, middle: string, tail: string) => `+996${'*'.repeat(middle.length)}${tail}`);
}

export async function initMonitoring(): Promise<void> {
  const dsn = meta('sentry-dsn');
  if (!dsn) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: meta('sentry-environment'),
    release: meta('app-release'),
    tracesSampleRate: 0,
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    beforeSend(event) {
      // Guest tokens live in ?g=…; names live in the path of invitation pages.
      const request = event.request ? { ...event.request, url: event.request.url?.split('?')[0], query_string: undefined } : undefined;
      const exception = event.exception?.values
        ? { values: event.exception.values.map((value) => ({ ...value, value: value.value && maskPhones(value.value) })) }
        : event.exception;
      return { ...event, request, exception, message: event.message && maskPhones(event.message) };
    },
  });
  capture = (error) => Sentry.captureException(error);
}

/** React root error hooks call this; a no-op until Sentry is loaded. */
export function reportError(error: unknown): void {
  capture?.(error);
}
