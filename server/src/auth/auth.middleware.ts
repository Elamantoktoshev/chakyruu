import type { RequestHandler, Response } from 'express';
import { HttpError } from '../lib/http.js';
import type { AuthService, SessionUser } from './auth.service.js';

export const SESSION_COOKIE = 'sid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      user?: SessionUser;
    }
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function readSessionToken(cookies: unknown): string | undefined {
  if (typeof cookies !== 'object' || cookies === null) return undefined;
  const value = (cookies as Record<string, unknown>)[SESSION_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Resolves the session cookie (if any) into `res.locals.user`. Never rejects the request. */
export function loadUser(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const token = readSessionToken(req.cookies);
    if (token) {
      const user = await auth.getSessionUser(token);
      if (user) res.locals.user = user;
    }
    next();
  };
}

export const requireAuth: RequestHandler = (_req, res, next) => {
  next(res.locals.user ? undefined : new HttpError(401, 'Authentication required'));
};

/** The authenticated user; only call after `requireAuth`. */
export function currentUser(res: Response): SessionUser {
  const { user } = res.locals;
  if (!user) throw new HttpError(401, 'Authentication required');
  return user;
}

/** "https://chakyruu.kg/" → "https://chakyruu.kg" — the exact form browsers send in the Origin header. */
export function normalizeOrigin(value: string): string {
  return new URL(value).origin;
}

/**
 * CSRF guard for cookie auth: state-changing requests sent by a browser must come from our origin.
 * Requests without an Origin header (curl, server-to-server) carry no ambient browser cookies risk.
 */
export function requireSameOrigin(configuredOrigin: string): RequestHandler {
  const allowedOrigin = normalizeOrigin(configuredOrigin);
  return (req, _res, next) => {
    const origin = req.get('origin');
    if (SAFE_METHODS.has(req.method) || !origin || origin === allowedOrigin) {
      next();
      return;
    }
    next(new HttpError(403, 'Cross-origin request rejected'));
  };
}
