import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { silentReporter, type ErrorReporter } from './errorReporter.js';
import { logger } from './logger.js';

/** Consistent API envelope: { success, data, error }. */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { message: string; details?: unknown } | null;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: ApiResponse<T> = { success: true, data, error: null };
  res.status(status).json(body);
}

function sendFail(res: Response, status: number, message: string, details?: unknown): void {
  const body: ApiResponse<never> = { success: false, data: null, error: { message, details } };
  res.status(status).json(body);
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  sendFail(res, 404, 'Route not found');
};

/** body-parser marks its client errors (413 too large, 415 charset…) with `type` and a 4xx `status`. */
function isBodyParserError(err: unknown): err is { status: number; type: string } {
  if (typeof err !== 'object' || err === null) return false;
  const { status, type } = err as { status?: unknown; type?: unknown };
  return typeof type === 'string' && typeof status === 'number' && status >= 400 && status < 500;
}

/** Turns errors into the JSON envelope; unexpected ones are logged and reported (Sentry). */
export function createErrorHandler(reporter: ErrorReporter = silentReporter): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof ZodError) {
      const details = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
      sendFail(res, 400, 'Validation failed', details);
      return;
    }
    if (err instanceof HttpError) {
      sendFail(res, err.status, err.message, err.details);
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      sendFail(res, 400, 'Malformed JSON body');
      return;
    }
    if (isBodyParserError(err)) {
      sendFail(res, err.status, err.status === 413 ? 'Request body is too large' : 'Invalid request body');
      return;
    }
    // req.log carries the requestId (pino-http); the id is also in the response header.
    (req.log ?? logger).error({ err }, 'Unhandled error');
    reporter.capture(err, { requestId: typeof req.id === 'string' ? req.id : undefined, method: req.method, path: req.originalUrl });
    sendFail(res, 500, 'Internal server error');
  };
}

export const errorHandler = createErrorHandler();
