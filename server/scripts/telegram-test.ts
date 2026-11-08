/**
 * Telegram setup helper for admin notifications.
 *
 *   npm run telegram:test
 *
 * 1. With only TELEGRAM_BOT_TOKEN set: lists the chats that recently wrote to the bot, so you can
 *    copy your TELEGRAM_CHAT_ID (send /start to the bot first).
 * 2. With both set: sends a test message to that chat.
 * Reads the root .env. The token is never printed.
 */
import { createTelegramSender } from '../src/notify/telegram.js';

const API_BASE = 'https://api.telegram.org';
// Telegram is sometimes slow to answer from Kyrgyzstan (~10 s seen): leave room.
const REQUEST_TIMEOUT_MS = 25_000;

interface Update {
  message?: { chat?: { id: number; type: string; title?: string; first_name?: string; username?: string } };
}

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function listChats(token: string): Promise<number> {
  const response = await fetch(`${API_BASE}/bot${token}/getUpdates`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: Update[]; description?: string };
  if (!body.ok) {
    out(`✗ Telegram refused the token: ${body.description ?? `HTTP ${response.status}`}. Check TELEGRAM_BOT_TOKEN.`);
    return 1;
  }
  const chats = new Map<number, string>();
  for (const update of body.result ?? []) {
    const chat = update.message?.chat;
    if (chat) chats.set(chat.id, chat.title ?? chat.first_name ?? chat.username ?? chat.type);
  }
  if (chats.size === 0) {
    out('No messages yet. Open your bot in Telegram, press Start (or send any message), then run this again.');
    return 1;
  }
  out('Chats that wrote to the bot — put the id into TELEGRAM_CHAT_ID:');
  for (const [id, name] of chats) out(`  ${id}  (${name})`);
  return 0;
}

async function main(): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token) {
    out('TELEGRAM_BOT_TOKEN is not set in the root .env. Create a bot with @BotFather and paste its token there.');
    return 2;
  }
  if (!chatId) return listChats(token);

  await createTelegramSender({ token, chatId })('✅ <b>Chakyruu.kg</b>\nTelegram-уведомления иштеп жатат. Уведомления работают.');
  out(`✓ Test message sent to chat ${chatId}. Check Telegram.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    out(`✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);
