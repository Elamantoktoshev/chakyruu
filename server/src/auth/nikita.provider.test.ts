import { describe, expect, it, vi } from 'vitest';
import { NikitaError, NikitaSmsProvider, buildMessageXml, newMessageId, readStatus, type NikitaConfig } from './nikita.provider.js';

const CONFIG: NikitaConfig = { login: 'chakyruu', password: 'p&ss<word>', sender: 'Chakyruu.kg', apiUrl: 'https://smspro.nikita.kg/api/message' };
const response = (status: number) => new Response(`<?xml version="1.0" encoding="UTF-8"?><response><id>X</id><status>${status}</status><phones>1</phones><smscnt>1</smscnt><message></message></response>`);

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
});
