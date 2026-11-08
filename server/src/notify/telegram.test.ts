import { describe, expect, it, vi } from 'vitest';
import { createTelegramSender } from './telegram.js';

const TOKEN = '123456789:AAH-secret-token-value-abcdefghijklmn';
const ok = () => new Response(JSON.stringify({ ok: true, result: {} }));

describe('createTelegramSender', () => {
  it('posts the message to sendMessage as HTML without link previews', async () => {
    const fetchMock = vi.fn(async () => ok());
    await createTelegramSender({ token: TOKEN, chatId: '-1001234', fetchImpl: fetchMock })('<b>Салам</b>');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.telegram.org/bot${TOKEN}/sendMessage`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ chat_id: '-1001234', text: '<b>Салам</b>', parse_mode: 'HTML', disable_web_page_preview: true });
  });

  it('fails with a message that never contains the bot token', async () => {
    const send = createTelegramSender({ token: TOKEN, chatId: '1', fetchImpl: vi.fn(async () => new Response('{"ok":false,"description":"chat not found"}', { status: 400 })) });
    const error = await send('x').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('chat not found');
    expect((error as Error).message).not.toContain(TOKEN);
  });

  it('hides the token when the network request itself fails', async () => {
    const send = createTelegramSender({
      token: TOKEN,
      chatId: '1',
      fetchImpl: vi.fn(async () => {
        throw new TypeError(`fetch failed for https://api.telegram.org/bot${TOKEN}/sendMessage`);
      }),
    });
    const error = (await send('x').catch((caught: unknown) => caught)) as Error;
    expect(error.message).not.toContain(TOKEN);
  });
});
