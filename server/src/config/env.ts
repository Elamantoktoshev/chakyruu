import { PHONE_PATTERN } from '@chakyruu/shared';
import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PREFIX = 'change-me';
const DEFAULT_CLIENT_URL = 'http://localhost:5173';

/** Lines like `CLIENT_IP_HEADER=` in .env mean "not set". */
const unsetIfEmpty = <T extends z.ZodType>(schema: T) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const flag = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((value) => value === 'true' || value === '1');

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const secret = z
  .string()
  .min(MIN_SECRET_LENGTH, `must be a random string of at least ${MIN_SECRET_LENGTH} characters`)
  .refine((value) => !value.startsWith(PLACEHOLDER_PREFIX), 'still has the placeholder value');

/** "+996555000001:123456,+996555000002:654321" → demo numbers that log in with a fixed code, no SMS. */
const testLoginPhones = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const pairs = (value ?? '').split(',').map((pair) => pair.trim()).filter(Boolean);
    const entries = pairs.map((pair) => {
      const [phone = '', code = ''] = pair.split(':').map((part) => part.trim());
      if (!PHONE_PATTERN.test(phone) || !/^\d{6}$/.test(code)) {
        ctx.addIssue({ code: 'custom', message: `"${pair}" must look like +996XXXXXXXXX:123456` });
      }
      return [phone, code] as const;
    });
    return new Map(entries);
  });

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// connection string'),
  /** Public address of the site (CORS origin, links in SMS/payments/OG). chakyruu.kg later. */
  CLIENT_URL: unsetIfEmpty(z.url()),
  /** Older names, still accepted. */
  CORS_ORIGIN: unsetIfEmpty(z.url()),
  PUBLIC_APP_URL: unsetIfEmpty(z.url()),
  OTP_SECRET: secret,
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),
  /** Header carrying the real client IP from the hosting edge (DigitalOcean: do-connecting-ip). */
  CLIENT_IP_HEADER: unsetIfEmpty(z.string().regex(/^[A-Za-z0-9-]{1,40}$/)),
  DEV_LOGIN_WITHOUT_SMS: flag,
  TEST_LOGIN_PHONES: testLoginPhones,
  ADMIN_PHONE: unsetIfEmpty(z.string().regex(PHONE_PATTERN)),

  SMS_PROVIDER: z.enum(['console', 'nikita']).default('console'),
  NIKITA_LOGIN: optionalText,
  NIKITA_PASSWORD: optionalText,
  /** Sender name approved by Nikita.kg (alpha name). */
  NIKITA_SENDER: optionalText,
  /** <test>1</test>: Nikita.kg checks login, sender and balance but sends nothing (first setup). */
  NIKITA_TEST_MODE: flag,
  /** Most SMS the whole site may send per 24 h (protects the balance from SMS bombing). */
  SMS_DAILY_LIMIT: z.coerce.number().int().min(1).max(100_000).default(500),
  NIKITA_API_URL: z.preprocess((value) => (value === '' ? undefined : value), z.url().default('https://smspro.nikita.kg/api/message')),

  STORAGE_PROVIDER: z.enum(['local', 'spaces']).default('local'),
  SPACES_KEY: optionalText,
  SPACES_SECRET: optionalText,
  SPACES_BUCKET: optionalText,
  /** e.g. fra1 */
  SPACES_REGION: optionalText,
  /** https://<bucket>.<region>.cdn.digitaloceanspaces.com (or a custom CDN domain). */
  SPACES_CDN_URL: unsetIfEmpty(z.url()),

  /** Set by the platform (App Platform: ${_self.COMMIT_HASH}); shown in /api/health. */
  COMMIT_SHA: optionalText,
  CLIENT_DIST_DIR: optionalText,
});

type BaseEnv = z.output<typeof baseSchema>;

/** Rules that depend on several variables or only apply in production. */
function checkCombinations(env: BaseEnv, ctx: z.RefinementCtx): void {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  const isProduction = env.NODE_ENV === 'production';
  const clientUrl = env.CLIENT_URL ?? env.CORS_ORIGIN;

  if (env.SMS_PROVIDER === 'nikita') {
    for (const key of ['NIKITA_LOGIN', 'NIKITA_PASSWORD', 'NIKITA_SENDER'] as const) if (!env[key]) issue(key, 'is required for SMS_PROVIDER=nikita');
  }
  if (env.STORAGE_PROVIDER === 'spaces') {
    for (const key of ['SPACES_KEY', 'SPACES_SECRET', 'SPACES_BUCKET', 'SPACES_REGION', 'SPACES_CDN_URL'] as const) {
      if (!env[key]) issue(key, 'is required for STORAGE_PROVIDER=spaces');
    }
  }
  if (env.ADMIN_PHONE && env.TEST_LOGIN_PHONES.has(env.ADMIN_PHONE)) issue('TEST_LOGIN_PHONES', 'must not contain ADMIN_PHONE');

  if (!isProduction) return;
  if (!clientUrl?.startsWith('https://')) issue('CLIENT_URL', 'must be the https:// address of the site in production');
  if (env.DEV_LOGIN_WITHOUT_SMS) issue('DEV_LOGIN_WITHOUT_SMS', 'must never be enabled in production');
  if (env.SMS_PROVIDER === 'console') issue('SMS_PROVIDER', 'console would print login codes into the logs; use nikita');
  if (env.NIKITA_TEST_MODE) issue('NIKITA_TEST_MODE', 'sends no SMS at all — turn it off once the setup is checked');
  // App Platform containers lose their disk on every deploy.
  if (env.STORAGE_PROVIDER === 'local') issue('STORAGE_PROVIDER', 'local files are lost on redeploy; use spaces');
}

const envSchema = baseSchema.superRefine(checkCombinations).transform((env) => {
  const clientUrl = (env.CLIENT_URL ?? env.CORS_ORIGIN ?? DEFAULT_CLIENT_URL).replace(/\/+$/, '');
  return { ...env, clientUrl, appUrl: (env.PUBLIC_APP_URL ?? clientUrl).replace(/\/+$/, ''), isProduction: env.NODE_ENV === 'production' };
});

export type Env = z.output<typeof envSchema>;

export class EnvError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment — fix these variables (see .env.example):\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    this.name = 'EnvError';
  }
}

/** Validates process.env once at startup; every problem is reported at once. */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;
  throw new EnvError(result.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`));
}
