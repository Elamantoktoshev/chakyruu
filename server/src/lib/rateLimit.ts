import type { RequestHandler } from 'express';
import { HttpError } from './http.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/**
 * Minimal in-memory fixed-window limiter keyed by client IP.
 * Good enough for a single instance; swap for a Redis-backed limiter when scaling out.
 */
export function rateLimit({ windowMs, max }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const current = hits.get(key);
    const entry =
      current && current.resetAt > now
        ? { ...current, count: current.count + 1 }
        : { count: 1, resetAt: now + windowMs };
    hits.set(key, entry);

    if (hits.size > 10_000) {
      for (const [ip, value] of hits) if (value.resetAt <= now) hits.delete(ip);
    }

    if (entry.count > max) {
      next(new HttpError(429, 'Too many requests, please try again later'));
      return;
    }
    next();
  };
}
