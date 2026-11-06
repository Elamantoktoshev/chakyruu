import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { ConsoleSmsProvider } from './auth/sms.js';
import { prisma } from './lib/prisma.js';
import { FakePaymentProvider } from './payments/payment.provider.js';
import { LocalStorageProvider } from './storage/storage.provider.js';

/** server/uploads — next to src/ and dist/. */
const UPLOADS_DIR = fileURLToPath(new URL('../uploads', import.meta.url));

const MIN_OTP_SECRET_LENGTH = 32;
const PLACEHOLDER_PREFIX = 'change-me';

function readConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set — copy .env.example to .env');
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid PORT: ${process.env.PORT}`);

  const otpSecret = process.env.OTP_SECRET ?? '';
  if (otpSecret.length < MIN_OTP_SECRET_LENGTH || otpSecret.startsWith(PLACEHOLDER_PREFIX)) {
    throw new Error(`OTP_SECRET must be a random string of at least ${MIN_OTP_SECRET_LENGTH} characters — see .env.example`);
  }

  // Number of reverse proxies in front of the API; client IPs (and rate limits) depend on it.
  const trustProxyHops = Number(process.env.TRUST_PROXY ?? 1);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error(`Invalid TRUST_PROXY: ${process.env.TRUST_PROXY}`);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const exposeOtpInResponse = process.env.DEV_LOGIN_WITHOUT_SMS === 'true';
  if (exposeOtpInResponse && isProduction) {
    throw new Error('DEV_LOGIN_WITHOUT_SMS must never be enabled in production');
  }
  if (exposeOtpInResponse) {
    console.warn('[auth] DEV_LOGIN_WITHOUT_SMS is on: anyone can log in with just a phone number');
  }
  if (isProduction) {
    // ConsoleSmsProvider would write login codes into production logs,
    // and FakePaymentProvider would publish invitations without payment.
    throw new Error('No real SMS / payment provider is configured for production yet');
  }

  return {
    port,
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    otpSecret,
    isProduction,
    trustProxyHops,
    exposeOtpInResponse,
    sms: new ConsoleSmsProvider(),
    storage: new LocalStorageProvider(UPLOADS_DIR),
    payments: new FakePaymentProvider(),
    uploadsDir: UPLOADS_DIR,
  };
}

const config = readConfig();
const server = createApp(config).listen(config.port, () => {
  console.info(`API listening on http://localhost:${config.port}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
