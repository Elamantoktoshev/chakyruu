import request from 'supertest';
import { createApp } from '../src/app.js';
import { MemorySmsProvider } from '../src/auth/sms.js';
import { FakeGateway } from '../src/payments/fake.gateway.js';
import type { PaymentGateway } from '../src/payments/gateway.js';
import { MemoryStorageProvider } from '../src/storage/storage.provider.js';

export const TEST_ORIGIN = 'http://localhost:5173';
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

export function buildTestApp(ctx: TestContext) {
  return createApp({
    corsOrigin: TEST_ORIGIN,
    otpSecret: TEST_OTP_SECRET,
    isProduction: false,
    sms: ctx.sms,
    storage: ctx.storage,
    payments: ctx.payments,
    now: () => new Date(Date.now() + ctx.clockOffsetMs),
  });
}

/** Full OTP login; returns a supertest agent that carries the session cookie. */
export async function loginAgent(ctx: TestContext, phone: string) {
  const agent = request.agent(buildTestApp(ctx));
  await agent.post('/api/auth/request-code').send({ phone }).expect(200);
  await agent.post('/api/auth/verify').send({ phone, code: ctx.sms.lastCodeFor(phone) }).expect(200);
  return agent;
}

/** Smallest valid PNG (1×1 transparent pixel). */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
