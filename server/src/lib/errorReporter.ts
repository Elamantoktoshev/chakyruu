import { maskPhonesInText, redactUrl } from './logger.js';

export interface ErrorContext {
  requestId?: string;
  method?: string;
  path?: string;
}

/** Where unexpected errors go besides the logs (Sentry when SENTRY_DSN is set). */
export interface ErrorReporter {
  capture(error: unknown, context?: ErrorContext): void;
}

export const silentReporter: ErrorReporter = { capture: () => undefined };

/** The parts of a Sentry event that may carry personal data. */
interface ScrubbableEvent {
  message?: string;
  request?: { cookies?: unknown; headers?: unknown; data?: unknown; query_string?: unknown; url?: string };
  exception?: { values?: { value?: string }[] };
  user?: unknown;
}

/** No cookies, headers, bodies, query strings, IPs or phone numbers leave the server. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const { request, user: _user, ...rest } = event;
  const exception = event.exception?.values
    ? { values: event.exception.values.map((value) => ({ ...value, value: value.value && maskPhonesInText(value.value) })) }
    : event.exception;
  return {
    ...rest,
    ...(event.message ? { message: maskPhonesInText(event.message) } : {}),
    ...(exception ? { exception } : {}),
    ...(request ? { request: { url: request.url && redactUrl(request.url) } } : {}),
  } as T;
}

interface SentryOptions {
  dsn: string;
  environment: string;
  release?: string;
}

/** Loads @sentry/node only when a DSN is configured. Error capture only, no tracing. */
export async function createSentryReporter({ dsn, environment, release }: SentryOptions): Promise<ErrorReporter> {
  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn,
    environment,
    release,
    // Nothing about the user or the request body leaves the server; beforeSend scrubs the rest.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
  return {
    capture(error, context = {}) {
      Sentry.withScope((scope) => {
        if (context.requestId) scope.setTag('request_id', context.requestId);
        if (context.method || context.path) scope.setContext('request', { method: context.method, path: context.path && redactUrl(context.path) });
        Sentry.captureException(error);
      });
    },
  };
}
