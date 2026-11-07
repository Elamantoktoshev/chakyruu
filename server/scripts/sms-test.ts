/**
 * Sends one real login-code SMS through Nikita.kg to check the account, sender name and server IP.
 *
 *   npm run sms:test -- +996XXXXXXXXX
 *
 * Reads NIKITA_LOGIN / NIKITA_PASSWORD / NIKITA_SENDER (and optional NIKITA_API_URL, NIKITA_TEST_MODE)
 * from the root .env, independent of SMS_PROVIDER. The SMS is charged unless NIKITA_TEST_MODE=1, in
 * which case the gateway only validates the request. Credentials are never printed; the phone is masked.
 */
import { randomInt } from 'node:crypto';
import { PHONE_PATTERN } from '@chakyruu/shared';
import { NikitaError, NikitaSmsProvider, type NikitaConfig } from '../src/auth/nikita.provider.js';
import { loginCodeText, maskPhone } from '../src/auth/sms.js';

const DEFAULT_API_URL = 'https://smspro.nikita.kg/api/message';
const CODE_LENGTH = 6;
const USAGE = 'Usage: npm run sms:test -- +996XXXXXXXXX';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set in the root .env`);
  return value;
}

/** "+996 700 123 456" / "996700123456" → "+996700123456"; null when it is not a Kyrgyz number. */
function parsePhone(input: string | undefined): string | null {
  if (!input) return null;
  const compact = input.replace(/[\s()-]/g, '');
  const phone = compact.startsWith('+') ? compact : `+${compact}`;
  return PHONE_PATTERN.test(phone) ? phone : null;
}

function readConfig(): NikitaConfig {
  const testMode = process.env.NIKITA_TEST_MODE?.trim();
  return {
    login: required('NIKITA_LOGIN'),
    password: required('NIKITA_PASSWORD'),
    sender: required('NIKITA_SENDER'),
    apiUrl: process.env.NIKITA_API_URL?.trim() || DEFAULT_API_URL,
    isTestMode: testMode === '1' || testMode === 'true',
  };
}

function testCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

async function main(): Promise<number> {
  const phone = parsePhone(process.argv[2]);
  if (!phone) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const config = readConfig();
  const text = loginCodeText(testCode());
  const mode = config.isTestMode ? 'TEST MODE (nothing is sent or charged)' : 'LIVE (the SMS is charged)';
  process.stdout.write(`Nikita.kg ${mode}: sender "${config.sender}", ${text.length} chars → ${maskPhone(phone)}\n`);

  try {
    await new NikitaSmsProvider(config).send(phone, text);
    process.stdout.write(config.isTestMode ? '✓ Request accepted by the gateway (status 11, test mode)\n' : '✓ Accepted for delivery — check the phone\n');
    return 0;
  } catch (error: unknown) {
    if (error instanceof NikitaError) {
      process.stderr.write(`✗ ${error.message}\n  kind: ${error.kind}, status: ${error.status ?? '—'}\n  what to do: ${error.hint}\n`);
      return 1;
    }
    throw error;
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`✗ ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  },
);
