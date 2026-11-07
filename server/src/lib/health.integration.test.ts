import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp, createTestContext } from '../../test/app.js';
import { prisma } from './prisma.js';

afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('reports the database and the running commit', async () => {
    const res = await request(buildTestApp(createTestContext(), { commitSha: 'f5d0ffd' })).get('/api/health').expect(200);
    expect(res.body.data).toEqual({ status: 'ok', database: 'ok', commit: 'f5d0ffd' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('answers 503 without details when the database is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('connect ECONNREFUSED 10.0.0.5:25060 password=secret'));
    const res = await request(buildTestApp(createTestContext())).get('/api/health').expect(503);
    expect(res.body.data).toMatchObject({ status: 'degraded', database: 'unavailable', commit: 'dev' });
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
