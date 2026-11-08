const API_BASE = 'https://api.telegram.org';
// Generous: alerts are sent in the background, nobody waits for them.
const REQUEST_TIMEOUT_MS = 20_000;

export interface TelegramConfig {
  token: string;
  /** Private chat with the bot, or a group/channel id (negative). */
  chatId: string;
  fetchImpl?: typeof fetch;
}

export type MessageSender = (html: string) => Promise<void>;

/** Bot API sendMessage. The token is part of the URL, so it is scrubbed from every error. */
export function createTelegramSender({ token, chatId, fetchImpl = fetch }: TelegramConfig): MessageSender {
  const scrub = (text: string): string => text.split(token).join('***');

  return async (html) => {
    let response: Response;
    try {
      response = await fetchImpl(`${API_BASE}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      throw new Error(`Telegram request failed: ${scrub(error instanceof Error ? error.message : String(error))}`);
    }
    if (response.ok) return;
    const body = (await response.json().catch(() => ({}))) as { description?: unknown };
    const reason = typeof body.description === 'string' ? body.description : `HTTP ${response.status}`;
    throw new Error(`Telegram refused the message: ${scrub(reason)}`);
  };
}
