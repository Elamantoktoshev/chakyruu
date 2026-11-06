import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { createInvitationFixture, resetDatabase } from '../../test/db.js';
import {
  OTP_DAILY_LIMIT_PER_PHONE,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  SESSION_TTL_MS,
  createAuthService,
} from './auth.service.js';
import { MemorySmsProvider } from './sms.js';
import { FakePaymentProvider } from '../payments/payment.provider.js';
import { MemoryStorageProvider } from '../storage/storage.provider.js';

const ORIGIN = 'http://localhost:5173';
const OWNER_PHONE = '+996700000001';
const STRANGER_PHONE = '+996555123456';
const SLUG = 'aibek-aizada';

let sms: MemorySmsProvider;
let clockOffsetMs: number;

function buildApp() {
  return createApp({
    corsOrigin: ORIGIN,
    otpSecret: 'integration-test-secret-integration-test',
    isProduction: false,
    sms,
    storage: new MemoryStorageProvider(),
    payments: new FakePaymentProvider(),
    now: () => new Date(Date.now() + clockOffsetMs),
  });
}

/** Full OTP login; returns an agent that carries the session cookie. */
async function login(phone: string) {
  const agent = request.agent(buildApp());
  await agent.post('/api/auth/request-code').send({ phone }).expect(200);
  await agent.post('/api/auth/verify').send({ phone, code: sms.lastCodeFor(phone) }).expect(200);
  return agent;
}

beforeEach(async () => {
  sms = new MemorySmsProvider();
  clockOffsetMs = 0;
  await resetDatabase();
  await createInvitationFixture({ slug: SLUG, ownerPhone: OWNER_PHONE, organizationId: null });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('OTP login', () => {
  it('logs in, exposes /me, and logs out', async () => {
    const agent = request.agent(buildApp());

    const requested = await agent.post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(200);
    expect(requested.body).toEqual({ success: true, data: { expiresInSeconds: 300 }, error: null });

    const verified = await agent
      .post('/api/auth/verify')
      .send({ phone: OWNER_PHONE, code: sms.lastCodeFor(OWNER_PHONE) })
      .expect(200);
    expect(verified.body.data.phone).toBe(OWNER_PHONE);
    const cookie = String(verified.headers['set-cookie']);
    expect(cookie).toMatch(/sid=[\w-]{43};/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.data.phone).toBe(OWNER_PHONE);

    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it('registers a new user on first login', async () => {
    await login(STRANGER_PHONE);
    const user = await prisma.user.findUnique({ where: { phone: STRANGER_PHONE } });
    expect(user?.role).toBe('OWNER');
  });

  it('rejects phones that are not +996XXXXXXXXX', async () => {
    const app = buildApp();
    for (const phone of ['0700123456', '+996 700 123 456', '+79001234567']) {
      const res = await request(app).post('/api/auth/request-code').send({ phone });
      expect(res.status, phone).toBe(400);
    }
    expect(sms.sent).toHaveLength(0);
  });

  it('rejects a wrong code and locks the code after too many attempts', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(200);
    const realCode = sms.lastCodeFor(OWNER_PHONE);
    const wrongCode = realCode === '000000' ? '111111' : '000000';

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: wrongCode }).expect(400);
    }
    await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: realCode }).expect(429);
  });

  it('rejects an expired code', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(200);
    clockOffsetMs = OTP_TTL_MS + 1000;
    await agent
      .post('/api/auth/verify')
      .send({ phone: OWNER_PHONE, code: sms.lastCodeFor(OWNER_PHONE) })
      .expect(400);
  });

  it('accepts a code only once and invalidates older codes on resend', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(200);
    const firstCode = sms.lastCodeFor(OWNER_PHONE);
    clockOffsetMs = OTP_RESEND_COOLDOWN_MS + 1000;
    await agent.post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(200);
    const secondCode = sms.lastCodeFor(OWNER_PHONE);

    if (firstCode !== secondCode) {
      await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: firstCode }).expect(400);
    }
    await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: secondCode }).expect(200);
    await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: secondCode }).expect(400);
  });

  it('limits code requests per phone', async () => {
    const app = buildApp();
    for (let i = 0; i < 3; i += 1) {
      clockOffsetMs = i * (OTP_RESEND_COOLDOWN_MS + 1000);
      await request(app).post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(200);
    }
    await request(app).post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(429);
  });

  it('enforces a resend cooldown and keeps the first code valid', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(200);
    const code = sms.lastCodeFor(OWNER_PHONE);

    await agent.post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(429);
    expect(sms.sent).toHaveLength(1);
    await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code }).expect(200);
  });

  it('caps the number of codes per phone per day', async () => {
    const auth = createAuthService({
      otpSecret: 'integration-test-secret-integration-test',
      sms,
      now: () => new Date(Date.now() + clockOffsetMs),
    });
    for (let i = 0; i < OTP_DAILY_LIMIT_PER_PHONE; i += 1) {
      clockOffsetMs = i * (OTP_RESEND_COOLDOWN_MS + 1000);
      await auth.requestOtp(OWNER_PHONE);
    }
    clockOffsetMs += OTP_RESEND_COOLDOWN_MS + 1000;
    await expect(auth.requestOtp(OWNER_PHONE)).rejects.toMatchObject({ status: 429 });
    expect(sms.sent).toHaveLength(OTP_DAILY_LIMIT_PER_PHONE);
  });

  it('treats an expired session as logged out', async () => {
    const agent = await login(OWNER_PHONE);
    clockOffsetMs = SESSION_TTL_MS + 1000;
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects state-changing requests from a foreign origin', async () => {
    await request(buildApp())
      .post('/api/auth/request-code')
      .set('Origin', 'https://evil.example')
      .send({ phone: OWNER_PHONE })
      .expect(403);
    expect(sms.sent).toHaveLength(0);
  });
});
