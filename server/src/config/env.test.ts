import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from './env.js';

const SECRET = 'a'.repeat(40);
const DEV = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db', OTP_SECRET: SECRET };
const PRODUCTION = {
  ...DEV,
  NODE_ENV: 'production',
  CLIENT_URL: 'https://chakyruu-abc.ondigitalocean.app/',
  SMS_PROVIDER: 'nikita',
  NIKITA_LOGIN: 'login',
  NIKITA_PASSWORD: 'password',
  NIKITA_SENDER: 'Chakyruu',
  STORAGE_PROVIDER: 'spaces',
  SPACES_KEY: 'key',
  SPACES_SECRET: 'secret',
  SPACES_BUCKET: 'chakyruu',
  SPACES_REGION: 'fra1',
  SPACES_CDN_URL: 'https://chakyruu.fra1.cdn.digitaloceanspaces.com',
};

function problemsOf(env: Record<string, string>): string[] {
  try {
    parseEnv(env);
    return [];
  } catch (error: unknown) {
    if (error instanceof EnvError) return [...error.problems];
    throw error;
  }
}

describe('parseEnv', () => {
  it('fills development defaults', () => {
    const env = parseEnv(DEV);
    expect(env).toMatchObject({ NODE_ENV: 'development', PORT: 4000, clientUrl: 'http://localhost:5173', appUrl: 'http://localhost:5173', isProduction: false });
    expect(env.SMS_PROVIDER).toBe('console');
    expect(env.STORAGE_PROVIDER).toBe('local');
  });

  it('accepts a complete production setup and trims the trailing slash of the site URL', () => {
    const env = parseEnv(PRODUCTION);
    expect(env.clientUrl).toBe('https://chakyruu-abc.ondigitalocean.app');
    expect(env.isProduction).toBe(true);
  });

  it('refuses to start without the database or with a weak secret, listing every problem', () => {
    const problems = problemsOf({ OTP_SECRET: 'change-me-please-change-me-please-123' });
    expect(problems.some((p) => p.startsWith('DATABASE_URL'))).toBe(true);
    expect(problems.some((p) => p.startsWith('OTP_SECRET') && p.includes('placeholder'))).toBe(true);
    expect(problemsOf({ ...DEV, OTP_SECRET: 'short' })[0]).toMatch(/^OTP_SECRET: must be a random string/);
  });

  it('enforces production rules: https, real SMS, Spaces, no dev login', () => {
    const problems = problemsOf({
      ...DEV,
      NODE_ENV: 'production',
      CLIENT_URL: 'http://insecure.example',
      DEV_LOGIN_WITHOUT_SMS: 'true',
    });
    for (const key of ['CLIENT_URL', 'DEV_LOGIN_WITHOUT_SMS', 'SMS_PROVIDER', 'STORAGE_PROVIDER']) {
      expect(problems.some((p) => p.startsWith(`${key}:`)), key).toBe(true);
    }
  });

  it('requires the provider credentials that the chosen providers need', () => {
    const problems = problemsOf({ ...DEV, SMS_PROVIDER: 'nikita', STORAGE_PROVIDER: 'spaces' });
    for (const key of ['NIKITA_LOGIN', 'NIKITA_SENDER', 'SPACES_KEY', 'SPACES_CDN_URL']) {
      expect(problems.some((p) => p.startsWith(`${key}:`)), key).toBe(true);
    }
  });

  it('parses demo login numbers and rejects malformed ones or the admin number', () => {
    const env = parseEnv({ ...DEV, TEST_LOGIN_PHONES: '+996555000001:123456, +996555000002:654321' });
    expect(env.TEST_LOGIN_PHONES.get('+996555000001')).toBe('123456');
    expect(problemsOf({ ...DEV, TEST_LOGIN_PHONES: '0555000001:12' })[0]).toMatch(/TEST_LOGIN_PHONES/);
    expect(problemsOf({ ...DEV, ADMIN_PHONE: '+996555000001', TEST_LOGIN_PHONES: '+996555000001:123456' })[0]).toMatch(/ADMIN_PHONE/);
  });

  it('keeps accepting the old CORS_ORIGIN / PUBLIC_APP_URL names', () => {
    const env = parseEnv({ ...DEV, CORS_ORIGIN: 'http://localhost:3000', PUBLIC_APP_URL: 'http://localhost:3001' });
    expect(env.clientUrl).toBe('http://localhost:3000');
    expect(env.appUrl).toBe('http://localhost:3001');
  });
});

describe('.env.example', () => {
  it('parses once the two required values are filled in', () => {
    const lines = readFileSync(new URL('../../../.env.example', import.meta.url), 'utf8').split('\n');
    const example = Object.fromEntries(
      lines.filter((line) => /^[A-Z_]+=/.test(line)).map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
    );
    const env = parseEnv({ ...example, OTP_SECRET: SECRET });
    expect(env.clientUrl).toBe('http://localhost:5173');
    expect(env.CLIENT_IP_HEADER).toBeUndefined();
  });
});
