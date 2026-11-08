import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http.js';
import { resetDatabase } from '../../test/db.js';
import { TEST_ORIGIN, TEST_OTP_SECRET } from '../../test/app.js';
import { MemorySmsProvider } from './sms.js';
import { FakeGateway } from '../payments/fake.gateway.js';
import { MemoryStorageProvider } from '../storage/storage.provider.js';
import type { GoogleOAuth, GoogleProfile } from './google.js';

const VALID_CODE = 'good-code';

/** Stands in for Google: accepts one code and remembers what it was asked. */
class FakeGoogle implements GoogleOAuth {
  lastChallenge: string | null = null;
  lastVerifier: string | null = null;

  constructor(private readonly profile: GoogleProfile) {}

  authorizationUrl({ state, codeChallenge }: { state: string; codeChallenge: string }): string {
    this.lastChallenge = codeChallenge;
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(state)}`;
  }

  async exchange(code: string, codeVerifier: string): Promise<GoogleProfile> {
    this.lastVerifier = codeVerifier;
    if (code !== VALID_CODE) throw new HttpError(401, 'Google sign-in failed');
    return this.profile;
  }
}

const PROFILE: GoogleProfile = { sub: 'google-sub-1', email: 'aizada@gmail.com', name: 'Айзада' };

function buildApp(google?: GoogleOAuth, adminEmails: ReadonlySet<string> = new Set()) {
  return createApp({
    adminEmails,
    corsOrigin: TEST_ORIGIN,
    otpSecret: TEST_OTP_SECRET,
    isProduction: false,
    sms: new MemorySmsProvider(),
    storage: new MemoryStorageProvider(),
    payments: new FakeGateway(),
    google,
  });
}

/** Runs /google/start and returns the agent (with the attempt cookie) and the state sent to Google. */
async function startSignIn(agent: ReturnType<typeof request.agent>, next = '/dashboard') {
  const res = await agent.get('/api/auth/google/start').query({ next }).expect(303);
  const state = new URL(res.headers.location as string).searchParams.get('state');
  expect(state).toBeTruthy();
  return state as string;
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Google sign-in', () => {
  it('reports whether Google sign-in is available', async () => {
    await request(buildApp()).get('/api/auth/options').expect(200, { success: true, data: { google: false }, error: null });
    const res = await request(buildApp(new FakeGoogle(PROFILE))).get('/api/auth/options').expect(200);
    expect(res.body.data).toEqual({ google: true });
  });

  it('is a 404 when Google is not configured', async () => {
    await request(buildApp()).get('/api/auth/google/start').expect(404);
  });

  it('creates the account on first sign-in, logs in and returns to the requested page', async () => {
    const google = new FakeGoogle(PROFILE);
    const agent = request.agent(buildApp(google));
    const state = await startSignIn(agent, '/create?template=x');

    const callback = await agent.get('/api/auth/google/callback').query({ code: VALID_CODE, state }).expect(303);
    expect(callback.headers.location).toBe(`${TEST_ORIGIN}/create?template=x`);
    expect(google.lastVerifier).toBeTruthy();

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.data).toMatchObject({ phone: null, email: 'aizada@gmail.com', name: 'Айзада', role: 'OWNER' });
    expect(await prisma.user.count({ where: { googleId: 'google-sub-1' } })).toBe(1);
  });

  it('reuses the same account on the next sign-in', async () => {
    const app = buildApp(new FakeGoogle(PROFILE));
    for (let i = 0; i < 2; i += 1) {
      const agent = request.agent(app);
      const state = await startSignIn(agent);
      await agent.get('/api/auth/google/callback').query({ code: VALID_CODE, state }).expect(303);
    }
    expect(await prisma.user.count()).toBe(1);
  });

  it('rejects a callback whose state does not match the attempt', async () => {
    const agent = request.agent(buildApp(new FakeGoogle(PROFILE)));
    await startSignIn(agent);
    const res = await agent.get('/api/auth/google/callback').query({ code: VALID_CODE, state: 'forged' }).expect(303);
    expect(res.headers.location).toBe(`${TEST_ORIGIN}/login?error=google`);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects a callback without a started attempt (no cookie)', async () => {
    const res = await request(buildApp(new FakeGoogle(PROFILE)))
      .get('/api/auth/google/callback')
      .query({ code: VALID_CODE, state: 'anything' })
      .expect(303);
    expect(res.headers.location).toBe(`${TEST_ORIGIN}/login?error=google`);
    expect(await prisma.user.count()).toBe(0);
  });

  it('sends the person back to login when Google refuses the code or they cancel', async () => {
    const agent = request.agent(buildApp(new FakeGoogle(PROFILE)));
    const state = await startSignIn(agent);
    const refused = await agent.get('/api/auth/google/callback').query({ code: 'bad', state }).expect(303);
    expect(refused.headers.location).toBe(`${TEST_ORIGIN}/login?error=google`);

    const cancelled = await agent.get('/api/auth/google/callback').query({ error: 'access_denied' }).expect(303);
    expect(cancelled.headers.location).toBe(`${TEST_ORIGIN}/login?error=google`);
    expect(await prisma.user.count()).toBe(0);
  });

  it('makes a listed, Google-verified e-mail an admin; everyone else stays an owner', async () => {
    const admins = new Set(['nyc.elaman@gmail.com']);
    const signIn = async (profile: GoogleProfile) => {
      const agent = request.agent(buildApp(new FakeGoogle(profile), admins));
      const state = await startSignIn(agent);
      await agent.get('/api/auth/google/callback').query({ code: VALID_CODE, state }).expect(303);
      return (await agent.get('/api/auth/me').expect(200)).body.data.role;
    };
    expect(await signIn({ sub: 'owner-sub', email: 'nyc.elaman@gmail.com', name: null })).toBe('ADMIN');
    expect(await signIn({ sub: 'other-sub', email: 'someone@gmail.com', name: null })).toBe('OWNER');
    // google.ts passes null when Google has not verified the address.
    expect(await signIn({ sub: 'unverified-sub', email: null, name: null })).toBe('OWNER');
  });

  it('never redirects off-site after sign-in', async () => {
    const agent = request.agent(buildApp(new FakeGoogle(PROFILE)));
    const state = await startSignIn(agent, '//evil.example/steal');
    const res = await agent.get('/api/auth/google/callback').query({ code: VALID_CODE, state }).expect(303);
    expect(res.headers.location).toBe(`${TEST_ORIGIN}/dashboard`);
  });
});
