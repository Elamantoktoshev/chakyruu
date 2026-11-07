import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import pino, { type Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const PHONE_IN_TEXT = /\+?996(\d{7})(\d{2})/g;
/** Personal-link tokens and similar secrets in query strings. */
const SECRET_QUERY = /([?&](?:g|token|code)=)[^&#]*/gi;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** "+996700123456" anywhere in a message → "+996*******56". */
export function maskPhonesInText(text: string): string {
  return text.replace(PHONE_IN_TEXT, (_match, middle: string, tail: string) => `+996${'*'.repeat(middle.length)}${tail}`);
}

/** "/aibek?g=abc" → "/aibek?g=[redacted]". */
export function redactUrl(url: string): string {
  return url.replace(SECRET_QUERY, '$1[redacted]');
}

/** Object keys never written to the logs (values are replaced). */
export const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.phone',
  '*.code',
  '*.otp',
  '*.password',
  '*.pwd',
  '*.token',
  '*.secret',
];

function createLogger(): Logger {
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
  const isDevelopment = !isTest && process.env.NODE_ENV !== 'production';
  return pino({
    level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : 'info'),
    base: { service: 'chakyruu' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    // Safety net for phones written into message text by mistake.
    hooks: {
      logMethod(args, method) {
        const masked = args.map((arg) => (typeof arg === 'string' ? maskPhonesInText(arg) : arg)) as Parameters<typeof method>;
        method.apply(this, masked);
      },
    },
    // Readable lines in development; JSON (one object per line) everywhere else.
    ...(isDevelopment ? { transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname,service' } } } : {}),
  });
}

/** JSON logs: requestId on every line, no phones, codes, cookies or guest tokens. */
export const logger = createLogger();

/**
 * Access log + `req.log` for handlers. Reuses a sane incoming X-Request-Id (from the edge) or
 * makes one, and returns it in the response so a user's error report can be found in the logs.
 */
export function requestLogger() {
  return pinoHttp({
    logger,
    genReqId(req: IncomingMessage, res: ServerResponse) {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url === '/api/health' || (req.url ?? '').startsWith('/assets/') },
    customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    serializers: {
      req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: redactUrl(req.url) }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
