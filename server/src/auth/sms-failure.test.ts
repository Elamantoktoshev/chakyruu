import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../lib/logger.js';
import { NikitaSmsProvider, type NikitaConfig } from './nikita.provider.js';
import { SMS_FAILED_USER_MESSAGE, logSmsFailure } from './sms-failure.js';

const PASSWORD = 'super-secret-pwd';
const CONFIG: NikitaConfig = { login: 'chakyruu-login', password: PASSWORD, sender: 'Chakyruu.kg', apiUrl: 'https://smspro.nikita.kg/api/message' };
const PHONE = '+996700123456';
const answer = (status: number) => new Response(`<response><status>${status}</status><smscnt>1</smscnt></response>`);

async function failingSend(status: number): Promise<unknown> {
  return new NikitaSmsProvider(CONFIG, vi.fn(async () => answer(status))).send(PHONE, 'Chakyruu: кодуңуз 123456').catch((error: unknown) => error);
}

function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return JSON.stringify(spy.mock.calls, (_key, value: unknown) => (value instanceof Error ? { message: value.message, stack: value.stack } : value));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logSmsFailure', () => {
  it.each([
    [2, 'auth'],
    [4, 'funds'],
    [5, 'sender'],
    [6, 'stopwords'],
  ])('logs status %i as kind %s with a hint', async (status, kind) => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    logSmsFailure(PHONE, await failingSend(status));
    const [fields, message] = spy.mock.calls[0] as unknown as [{ sms: { kind: string; status: number; hint: string } }, string];
    expect(fields.sms).toMatchObject({ kind, status });
    expect(fields.sms.hint).toBeTruthy();
    expect(message).toContain(kind);
  });

  it('masks the phone and never logs credentials or the code', async () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    logSmsFailure(PHONE, await failingSend(2));
    const text = loggedText(spy);
    expect(text).toContain('+996*******56');
    expect(text).not.toContain('996700123456');
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain('chakyruu-login');
    expect(text).not.toContain('123456');
  });

  it('logs unexpected errors as unknown, still masked', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    logSmsFailure(PHONE, new Error('boom'));
    expect(spy.mock.calls[0]?.[0]).toMatchObject({ sms: { kind: 'unknown' } });
    expect(loggedText(spy)).not.toContain('996700123456');
  });

  it('has the Kyrgyz message for the user', () => {
    expect(SMS_FAILED_USER_MESSAGE).toBe('Код жөнөтүлгөн жок, кайра аракет кылыңыз');
  });
});
