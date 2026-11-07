import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp, type AppConfig } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { createInvitationFixture, resetDatabase } from '../../test/db.js';
import { HUMAN_FORM } from '../../test/app.js';
import {
  OTP_DAILY_LIMIT_PER_PHONE,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  SESSION_TTL_MS,
  createAuthService,
} from './auth.service.js';
import { MemorySmsProvider } from './sms.js';
import { FakeGateway } from '../payments/fake.gateway.js';
import { MemoryStorageProvider } from '../storage/storage.provider.js';

const ORIGIN = 'http://localhost:5173';
const OWNER_PHONE = '+996700000001';
const STRANGER_PHONE = '+996555123456';
const SLUG = 'aibek-aizada';

let sms: MemorySmsProvider;
let clockOffsetMs: number;

function buildApp(overrides: Partial<AppConfig> = {}) {
  return createApp({
    corsOrigin: ORIGIN,
    otpSecret: 'integration-test-secret-integration-test',
    isProduction: false,
    sms,
    storage: new MemoryStorageProvider(),
    payments: new FakeGateway(),
    now: () => new Date(Date.now() + clockOffsetMs),
    ...overrides,
  });
}

/** Full OTP login; returns an agent that carries the session cookie. */
async function login(phone: string) {
  const agent = request.agent(buildApp());
  await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone }).expect(200);
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

    const requested = await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
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
      const res = await request(app).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone });
      expect(res.status, phone).toBe(400);
    }
    expect(sms.sent).toHaveLength(0);
  });

  it('rejects a wrong code and locks the code after too many attempts', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    const realCode = sms.lastCodeFor(OWNER_PHONE);
    const wrongCode = realCode === '000000' ? '111111' : '000000';

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: wrongCode }).expect(400);
    }
    await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: realCode }).expect(429);
  });

  it('rejects an expired code', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    clockOffsetMs = OTP_TTL_MS + 1000;
    await agent
      .post('/api/auth/verify')
      .send({ phone: OWNER_PHONE, code: sms.lastCodeFor(OWNER_PHONE) })
      .expect(400);
  });

  it('accepts a code only once and invalidates older codes on resend', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    const firstCode = sms.lastCodeFor(OWNER_PHONE);
    clockOffsetMs = OTP_RESEND_COOLDOWN_MS + 1000;
    await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
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
      await request(app).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    }
    await request(app).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(429);
  });

  it('enforces a resend cooldown and keeps the first code valid', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    const code = sms.lastCodeFor(OWNER_PHONE);

    await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(429);
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
      .send({ ...HUMAN_FORM, phone: OWNER_PHONE })
      .expect(403);
    expect(sms.sent).toHaveLength(0);
  });
});

describe('dev login without SMS', () => {
  it('returns the code in the response only when the dev flag is on', async () => {
    const devApp = createApp({
      corsOrigin: ORIGIN,
      otpSecret: 'integration-test-secret-integration-test',
      isProduction: false,
      sms,
      storage: new MemoryStorageProvider(),
      payments: new FakeGateway(),
      exposeOtpInResponse: true,
    });
    const agent = request.agent(devApp);
    const res = await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    expect(res.body.data.devCode).toBe(sms.lastCodeFor(OWNER_PHONE));
    await agent.post('/api/auth/verify').send({ phone: OWNER_PHONE, code: res.body.data.devCode }).expect(200);

    const normal = await request(buildApp()).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: STRANGER_PHONE }).expect(200);
    expect(normal.body.data.devCode).toBeUndefined();
  });
});

describe('SMS protection and demo numbers', () => {
  const DEMO_PHONE = '+996555000001';

  it('sends the code in Kyrgyz', async () => {
    await request(buildApp()).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    expect(sms.sent.at(-1)?.text).toMatch(/^Chakyruu: кодуңуз \d{6}$/);
  });

  it('pretends to accept a bot that filled the hidden field, but sends nothing', async () => {
    const res = await request(buildApp())
      .post('/api/auth/request-code')
      .send({ ...HUMAN_FORM, phone: OWNER_PHONE, website: 'http://spam.example' })
      .expect(200);
    expect(res.body.data.expiresInSeconds).toBe(OTP_TTL_MS / 1000);
    expect(sms.sent).toHaveLength(0);
    expect(await prisma.otpCode.count()).toBe(0);
  });

  it('refuses forms submitted faster than a person can type, and requests without the timing', async () => {
    await request(buildApp()).post('/api/auth/request-code').send({ phone: OWNER_PHONE, elapsedMs: 200 }).expect(429);
    await request(buildApp()).post('/api/auth/request-code').send({ phone: OWNER_PHONE }).expect(400);
    expect(sms.sent).toHaveLength(0);
  });

  it('logs demo numbers in with their fixed code and no SMS', async () => {
    const agent = request.agent(buildApp({ testLoginPhones: new Map([[DEMO_PHONE, '123456']]) }));
    await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: DEMO_PHONE }).expect(200);
    expect(sms.sent).toHaveLength(0);
    await agent.post('/api/auth/verify').send({ phone: DEMO_PHONE, code: '654321' }).expect(400);
    await agent.post('/api/auth/verify').send({ phone: DEMO_PHONE, code: '123456' }).expect(200);
  });

  it('pauses login codes once the daily SMS budget is spent, demo numbers excluded', async () => {
    const app = buildApp({ smsDailyLimit: 1, testLoginPhones: new Map([[DEMO_PHONE, '123456']]) });
    await request(app).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: DEMO_PHONE }).expect(200);
    await request(app).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: OWNER_PHONE }).expect(200);
    const blocked = await request(app).post('/api/auth/request-code').send({ ...HUMAN_FORM, phone: STRANGER_PHONE }).expect(503);
    expect(blocked.body.error.message).toBe('Login is temporarily unavailable, please try again later');
    expect(sms.sent).toHaveLength(1);
  });
});

