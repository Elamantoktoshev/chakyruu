import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

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

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
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
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  sendFail(res, 500, 'Internal server error');
};
