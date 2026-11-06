import type { Request, RequestHandler } from 'express';
import { HttpError } from './http.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Bucket key for a request; defaults to the client IP. */
  key?: (req: Request) => string;
}

const MAX_TRACKED_KEYS = 10_000;

const byIp = (req: Request): string => req.ip ?? 'unknown';

/**
 * Minimal in-memory fixed-window limiter.
 * Good enough for a single instance; swap for a Redis-backed limiter when scaling out.
 */
export function rateLimit({ windowMs, max, key = byIp }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, _res, next) => {
    const now = Date.now();
    const bucket = key(req);
    const current = hits.get(bucket);
    const entry =
      current && current.resetAt > now
        ? { ...current, count: current.count + 1 }
        : { count: 1, resetAt: now + windowMs };
    hits.set(bucket, entry);

    if (hits.size > MAX_TRACKED_KEYS) {
      for (const [name, value] of hits) if (value.resetAt <= now) hits.delete(name);
    }

    if (entry.count > max) {
      next(new HttpError(429, 'Too many requests, please try again later'));
      return;
    }
    next();
  };
}
