import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../lib/logger.js';
import {
  NikitaError,
  NikitaSmsProvider,
  buildMessageXml,
  newMessageId,
  readSmsCount,
  readStatus,
  type NikitaConfig,
  type NikitaFailureKind,
} from './nikita.provider.js';

const CONFIG: NikitaConfig = { login: 'chakyruu', password: 'p&ss<word>', sender: 'Chakyruu.kg', apiUrl: 'https://smspro.nikita.kg/api/message' };
const response = (status: number, smsCount = 1) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><response><id>X</id><status>${status}</status><phones>1</phones><smscnt>${smsCount}</smscnt><message></message></response>`);
const PHONE = '+996700123456';

async function failureOf(provider: NikitaSmsProvider): Promise<NikitaError> {
  const error: unknown = await provider.send(PHONE, 'x').catch((caught: unknown) => caught);
  if (!(error instanceof NikitaError)) throw new Error('expected a NikitaError');
  return error;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildMessageXml', () => {
  it('follows the Nikita.kg format and escapes every value', () => {
    const body = buildMessageXml(CONFIG, 'ABC123DEF456', '+996700123456', 'Chakyruu.kg: кирүү коду 123456 <ok>');
    expect(body).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><message><login>chakyruu</login><pwd>p&amp;ss&lt;word&gt;</pwd><id>ABC123DEF456</id>' +
        '<sender>Chakyruu.kg</sender><text>Chakyruu.kg: кирүү коду 123456 &lt;ok&gt;</text><phones><phone>996700123456</phone></phones></message>',
    );
    expect(buildMessageXml({ ...CONFIG, isTestMode: true }, 'A', '+996700123456', 'x')).toContain('<test>1</test></message>');
  });
});

describe('newMessageId', () => {
  it('makes 12 Latin letters/digits, different every time', () => {
    const ids = new Set(Array.from({ length: 200 }, newMessageId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Z0-9]{12}$/);
  });
});

describe('readStatus', () => {
  it('reads the status or returns null for anything else', () => {
    expect(readStatus('<response><status>4</status></response>')).toBe(4);
    expect(readStatus('<html>502 Bad Gateway</html>')).toBeNull();
  });

  it('reads the number of SMS parts', () => {
    expect(readSmsCount('<response><status>0</status><smscnt>2</smscnt></response>')).toBe(2);
    expect(readSmsCount('<response><status>0</status></response>')).toBeNull();
  });
});

describe('NikitaSmsProvider', () => {
  it('posts XML over https and accepts status 0', async () => {
    const fetchMock = vi.fn(async () => response(0));
    await new NikitaSmsProvider(CONFIG, fetchMock).send('+996700123456', 'код 123456');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://smspro.nikita.kg/api/message');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toContain('application/xml');
  });

  it('retries once with the same id when the gateway is busy (status 9)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(9)).mockResolvedValueOnce(response(0));
    const wait = vi.fn(async () => undefined);
    await new NikitaSmsProvider(CONFIG, fetchMock, wait).send('+996700123456', 'x');
    expect(wait).toHaveBeenCalledWith(6000);
    const bodies = fetchMock.mock.calls.map(([, init]) => (init as RequestInit).body);
    expect(bodies[0]).toBe(bodies[1]);
  });

  it('explains failures without leaking the password or the full phone', async () => {
    const provider = new NikitaSmsProvider(CONFIG, vi.fn(async () => response(4)));
    const error = await provider.send('+996700123456', 'x').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NikitaError);
    expect((error as NikitaError).status).toBe(4);
    expect((error as Error).message).toContain('not enough money');
    expect((error as Error).message).toContain('+996*******56');
    expect((error as Error).message).not.toContain('p&ss');
  });

  it('treats HTTP errors and unreadable answers as failures', async () => {
    await expect(new NikitaSmsProvider(CONFIG, vi.fn(async () => new Response('down', { status: 503 }))).send('+996700123456', 'x')).rejects.toThrow('HTTP 503');
    await expect(new NikitaSmsProvider(CONFIG, vi.fn(async () => new Response('<html/>'))).send('+996700123456', 'x')).rejects.toThrow('unreadable');
  });

  it('accepts status 11 only in test mode', async () => {
    await new NikitaSmsProvider({ ...CONFIG, isTestMode: true }, vi.fn(async () => response(11))).send('+996700123456', 'x');
    await expect(new NikitaSmsProvider(CONFIG, vi.fn(async () => response(11))).send('+996700123456', 'x')).rejects.toBeInstanceOf(NikitaError);
  });

  it('sends the expected XML body to the gateway', async () => {
    const fetchMock = vi.fn(async () => response(0));
    await new NikitaSmsProvider(CONFIG, fetchMock).send(PHONE, 'Chakyruu: кодуңуз 123456');
    const body = String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(body).toMatch(/<id>[A-Z0-9]{12}<\/id>/);
    expect(body).toContain('<sender>Chakyruu.kg</sender>');
    expect(body).toContain('<text>Chakyruu: кодуңуз 123456</text>');
    expect(body).toContain('<phones><phone>996700123456</phone></phones>');
    expect(body).not.toContain('<test>');
  });

  it('uses a new id for every sending', async () => {
    const fetchMock = vi.fn(async () => response(0));
    const provider = new NikitaSmsProvider(CONFIG, fetchMock);
    await provider.send(PHONE, 'a');
    await provider.send(PHONE, 'a');
    const ids = fetchMock.mock.calls.map(([, init]) => /<id>(\w+)<\/id>/.exec(String((init as RequestInit).body))?.[1]);
    expect(ids[0]).not.toBe(ids[1]);
  });

  const FAILURES: ReadonlyArray<[number, NikitaFailureKind, string]> = [
    [1, 'format', 'invalid request format'],
    [2, 'auth', 'invalid login or password'],
    [3, 'ip', 'IP address is not allowed'],
    [4, 'funds', 'not enough money'],
    [5, 'sender', 'sender name is not approved'],
    [6, 'stopwords', 'stop-words'],
    [7, 'phone', 'invalid phone number'],
    [8, 'time', 'invalid send time'],
    [10, 'duplicate', 'duplicate message id'],
  ];

  it.each(FAILURES)('status %i → kind %s with an actionable hint', async (status, kind, detail) => {
    const error = await failureOf(new NikitaSmsProvider(CONFIG, vi.fn(async () => response(status))));
    expect(error.status).toBe(status);
    expect(error.kind).toBe(kind);
    expect(error.message).toContain(detail);
    expect(error.hint.length).toBeGreaterThan(10);
    expect(`${error.message} ${error.hint}`).not.toContain('p&ss');
    expect(error.message).not.toContain('996700123456');
  });

  it('gives a busy error when the gateway is still busy after the retry', async () => {
    const error = await failureOf(new NikitaSmsProvider(CONFIG, vi.fn(async () => response(9)), async () => undefined));
    expect(error.kind).toBe('busy');
  });

  it('turns unknown statuses and network failures into typed errors', async () => {
    expect((await failureOf(new NikitaSmsProvider(CONFIG, vi.fn(async () => response(42))))).kind).toBe('unknown');
    const offline = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const error = await failureOf(new NikitaSmsProvider(CONFIG, offline));
    expect(error.kind).toBe('http');
    expect(error.message).toContain('+996*******56');
  });

  it('warns when the text was split into several charged parts', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    await new NikitaSmsProvider(CONFIG, vi.fn(async () => response(0, 2))).send(PHONE, 'x');
    expect(warn).toHaveBeenCalledWith({ smsCount: 2 }, expect.stringContaining('several parts'));
  });

  it('does not warn for a single-part SMS', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    await new NikitaSmsProvider(CONFIG, vi.fn(async () => response(0))).send(PHONE, 'x');
    expect(warn).not.toHaveBeenCalled();
  });
});
