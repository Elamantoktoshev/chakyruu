import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, type AppConfig } from './app.js';
import { NikitaSmsProvider } from './auth/nikita.provider.js';
import { ConsoleSmsProvider, type SmsProvider } from './auth/sms.js';
import { EnvError, parseEnv, type Env } from './config/env.js';
import { createSentryReporter, silentReporter, type ErrorReporter } from './lib/errorReporter.js';
import { prisma } from './lib/prisma.js';
import { installGracefulShutdown } from './lib/shutdown.js';
import { createGatewayFromEnv } from './payments/registry.js';
import { SpacesStorageProvider, createSpacesClient } from './storage/spaces.provider.js';
import { LocalStorageProvider, type StorageProvider } from './storage/storage.provider.js';
import { logger } from './lib/logger.js';

/** server/uploads — next to src/ and dist/. */
const UPLOADS_DIR = fileURLToPath(new URL('../uploads', import.meta.url));
/** Built client (npm run build -w client). In development Vite serves it instead. */
const DEFAULT_CLIENT_DIR = fileURLToPath(new URL('../../client/dist', import.meta.url));

/** The API serves the site only when a client build exists (production, `vite build` locally). */
function findClientDir(env: Env): string | undefined {
  const dir = env.CLIENT_DIST_DIR ?? DEFAULT_CLIENT_DIR;
  return existsSync(path.join(dir, 'index.html')) ? dir : undefined;
}

function createSms(env: Env): SmsProvider {
  if (env.SMS_PROVIDER === 'console') return new ConsoleSmsProvider();
  // parseEnv guarantees the NIKITA_* credentials for SMS_PROVIDER=nikita.
  return new NikitaSmsProvider({
    login: env.NIKITA_LOGIN ?? '',
    password: env.NIKITA_PASSWORD ?? '',
    sender: env.NIKITA_SENDER ?? '',
    apiUrl: env.NIKITA_API_URL,
    isTestMode: env.NIKITA_TEST_MODE,
  });
}

function createStorage(env: Env): StorageProvider {
  if (env.STORAGE_PROVIDER === 'local') return new LocalStorageProvider(UPLOADS_DIR);
  // parseEnv guarantees every SPACES_* value is present for STORAGE_PROVIDER=spaces.
  const config = {
    key: env.SPACES_KEY ?? '',
    secret: env.SPACES_SECRET ?? '',
    bucket: env.SPACES_BUCKET ?? '',
    region: env.SPACES_REGION ?? '',
    cdnUrl: env.SPACES_CDN_URL ?? '',
  };
  return new SpacesStorageProvider(createSpacesClient(config), config.bucket, config.cdnUrl);
}

function buildConfig(env: Env): AppConfig & { port: number } {
  if (env.DEV_LOGIN_WITHOUT_SMS) {
    logger.warn('[auth] DEV_LOGIN_WITHOUT_SMS is on: anyone can log in with just a phone number');
  }
  const storage = createStorage(env);
  return {
    port: env.PORT,
    corsOrigin: env.clientUrl,
    appUrl: env.appUrl,
    otpSecret: env.OTP_SECRET,
    isProduction: env.isProduction,
    trustProxyHops: env.TRUST_PROXY,
    exposeOtpInResponse: env.DEV_LOGIN_WITHOUT_SMS,
    sms: createSms(env),
    storage,
    // Refuses fake/unimplemented gateways in production (see payments/registry.ts).
    payments: createGatewayFromEnv(process.env, env.isProduction),
    // Local files are served by the API; Spaces files come from the CDN.
    uploadsDir: storage instanceof LocalStorageProvider ? UPLOADS_DIR : undefined,
    clientDir: findClientDir(env),
    commitSha: env.COMMIT_SHA,
    clientIpHeader: env.CLIENT_IP_HEADER,
    browser: {
      sentryDsn: env.SENTRY_DSN_CLIENT ?? env.SENTRY_DSN,
      environment: env.NODE_ENV,
      release: env.COMMIT_SHA,
      umamiWebsiteId: env.UMAMI_WEBSITE_ID,
      umamiScriptUrl: env.UMAMI_SCRIPT_URL,
    },
    testLoginPhones: env.TEST_LOGIN_PHONES,
    mediaOrigins: env.SPACES_CDN_URL ? [new URL(env.SPACES_CDN_URL).origin] : [],
    smsDailyLimit: env.SMS_DAILY_LIMIT,
  };
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error: unknown) {
    if (error instanceof EnvError) {
      logger.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

async function createErrorReporter(env: Env): Promise<ErrorReporter> {
  if (!env.SENTRY_DSN) return silentReporter;
  return createSentryReporter({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, release: env.COMMIT_SHA });
}

const env = loadEnv();
const config = { ...buildConfig(env), errorReporter: await createErrorReporter(env) };
const server = createApp(config).listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port}`);
});
installGracefulShutdown(server, () => prisma.$disconnect());
