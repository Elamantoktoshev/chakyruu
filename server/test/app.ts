import request from 'supertest';
import { createApp, type AppConfig } from '../src/app.js';
import { MemorySmsProvider } from '../src/auth/sms.js';
import { FakeGateway } from '../src/payments/fake.gateway.js';
import type { PaymentGateway } from '../src/payments/gateway.js';
import { MemoryStorageProvider } from '../src/storage/storage.provider.js';

export const TEST_ORIGIN = 'http://localhost:5173';
/** The login form's anti-bot fields as a person fills them in (see auth.schemas.ts). */
export const HUMAN_FORM = { elapsedMs: 5000 } as const;
export const TEST_OTP_SECRET = 'integration-test-secret-integration-test';

export interface TestContext {
  sms: MemorySmsProvider;
  storage: MemoryStorageProvider;
  payments: PaymentGateway;
  /** Shift the app clock (codes, sessions) forward in tests. */
  clockOffsetMs: number;
}

export function createTestContext(payments: PaymentGateway = new FakeGateway()): TestContext {
  return {
    sms: new MemorySmsProvider(),
    storage: new MemoryStorageProvider(),
    payments,
    clockOffsetMs: 0,
  };
}

export function buildTestApp(ctx: TestContext, overrides: Partial<AppConfig> = {}) {
  return createApp({
    corsOrigin: TEST_ORIGIN,
    otpSecret: TEST_OTP_SECRET,
    isProduction: false,
    sms: ctx.sms,
    storage: ctx.storage,
    payments: ctx.payments,
    now: () => new Date(Date.now() + ctx.clockOffsetMs),
    // ffmpeg may or may not be installed where tests run.
    compressAudio: async (data) => ({ data, isCompressed: false }),
    ...overrides,
  });
}

/** Full OTP login; returns a supertest agent that carries the session cookie. */
export async function loginAgent(ctx: TestContext, phone: string) {
  const agent = request.agent(buildTestApp(ctx));
  await agent.post('/api/auth/request-code').send({ ...HUMAN_FORM, phone }).expect(200);
  await agent.post('/api/auth/verify').send({ phone, code: ctx.sms.lastCodeFor(phone) }).expect(200);
  return agent;
}

/** Smallest valid PNG (1×1 transparent pixel). */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** "ID3" tag header followed by data — what most mp3 files start with. */
export const TINY_MP3 = Buffer.concat([Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00', 'latin1'), Buffer.alloc(64, 0x11)]);
