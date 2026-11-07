import type { RequestHandler } from 'express';
import { prisma } from './prisma.js';

const DB_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms).unref())]);
}

/**
 * GET /api/health — used by App Platform health checks and after a deploy.
 * 200 when the database answers, 503 otherwise (no error details leak out).
 */
export function createHealthHandler(commitSha: string | undefined): RequestHandler {
  const commit = commitSha ?? 'dev';
  return async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS);
      res.json({ success: true, data: { status: 'ok', database: 'ok', commit }, error: null });
    } catch (error: unknown) {
      console.error('[health] database check failed', error);
      res.status(503).json({ success: false, data: { status: 'degraded', database: 'unavailable', commit }, error: { message: 'Database unavailable' } });
    }
  };
}
