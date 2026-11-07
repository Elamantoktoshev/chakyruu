import { isIP } from 'node:net';
import type { Request, RequestHandler } from 'express';

const resolvedIps = new WeakMap<Request, string>();

/**
 * Behind DigitalOcean's edge the client address arrives in a header (do-connecting-ip) that the
 * edge sets itself. When configured, that header wins over Express's req.ip; a malformed value
 * is ignored so a client cannot pick its own rate-limit bucket.
 */
export function resolveClientIp(header: string | undefined): RequestHandler {
  const name = header?.toLowerCase();
  return (req, _res, next) => {
    const value = name ? req.headers[name] : undefined;
    const candidate = typeof value === 'string' ? value.trim() : '';
    if (candidate && isIP(candidate)) resolvedIps.set(req, candidate);
    next();
  };
}

/** Client IP for rate limits and click de-duplication. */
export function clientIp(req: Request): string {
  return resolvedIps.get(req) ?? req.ip ?? 'unknown';
}
