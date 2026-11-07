import { randomBytes } from 'node:crypto';
import { maskPhone, type SmsProvider } from './sms.js';

/**
 * Nikita.kg (smspro.nikita.kg) HTTP/XML API, protocol document "HTTP/XML-integration SMS-delivery
 * protocol description": POST an XML <message> to /api/message, read <status> from the response.
 */
export interface NikitaConfig {
  login: string;
  password: string;
  /** Sender name approved by Nikita.kg: up to 11 Latin letters, digits, dots and dashes. */
  sender: string;
  apiUrl: string;
  /** <test>1</test>: the gateway checks the request but sends and charges nothing (status 11). */
  isTestMode?: boolean;
}

/** Response statuses of /api/message. */
const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  1: 'invalid request format',
  2: 'invalid login or password',
  3: 'server IP address is not allowed (ask Nikita.kg to allow it)',
  4: 'not enough money on the Nikita.kg account',
  5: 'sender name is not approved by Nikita.kg',
  6: 'message blocked by stop-words',
  7: 'invalid phone number',
  8: 'invalid send time',
  9: 'gateway busy',
  10: 'duplicate message id',
};
const STATUS_ACCEPTED = 0;
const STATUS_BUSY = 9;
const STATUS_TEST_ACCEPTED = 11;

const REQUEST_TIMEOUT_MS = 10_000;
/** Status 9: "repeat the request with the same id in 5-10 seconds". */
const BUSY_RETRY_DELAY_MS = 6_000;
const MESSAGE_ID_LENGTH = 12;
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class NikitaError extends Error {
  constructor(readonly status: number | null, detail: string) {
    super(`Nikita.kg: ${detail}`);
    this.name = 'NikitaError';
  }
}

/** Unique per sending, up to 12 Latin letters and digits (the gateway blocks repeated ids). */
export function newMessageId(): string {
  return [...randomBytes(MESSAGE_ID_LENGTH)].map((byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
}

const XML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xml = (value: string): string => value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);

export function buildMessageXml(config: NikitaConfig, id: string, phone: string, text: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<message>',
    `<login>${xml(config.login)}</login>`,
    `<pwd>${xml(config.password)}</pwd>`,
    `<id>${id}</id>`,
    `<sender>${xml(config.sender)}</sender>`,
    `<text>${xml(text)}</text>`,
    // The gateway accepts 996XXXXXXXXX or +996XXXXXXXXX.
    `<phones><phone>${xml(phone.replace(/^\+/, ''))}</phone></phones>`,
    ...(config.isTestMode ? ['<test>1</test>'] : []),
    '</message>',
  ].join('');
}

export function readStatus(responseXml: string): number | null {
  const match = /<status>\s*(\d+)\s*<\/status>/.exec(responseXml);
  return match ? Number(match[1]) : null;
}

type Fetch = typeof fetch;
type Sleep = (ms: number) => Promise<void>;
const sleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class NikitaSmsProvider implements SmsProvider {
  constructor(
    private readonly config: NikitaConfig,
    private readonly fetchImpl: Fetch = fetch,
    private readonly wait: Sleep = sleep,
  ) {}

  async send(phone: string, text: string): Promise<void> {
    const id = newMessageId();
    const body = buildMessageXml(this.config, id, phone, text);
    const status = await this.post(body);
    if (status === STATUS_BUSY) {
      await this.wait(BUSY_RETRY_DELAY_MS);
      return this.check(await this.post(body), phone);
    }
    return this.check(status, phone);
  }

  private async post(body: string): Promise<number | null> {
    const response = await this.fetchImpl(this.config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new NikitaError(null, `HTTP ${response.status}`);
    return readStatus(await response.text());
  }

  private check(status: number | null, phone: string): void {
    if (status === STATUS_ACCEPTED || (this.config.isTestMode && status === STATUS_TEST_ACCEPTED)) return;
    const detail = status === null ? 'unreadable response' : (STATUS_MESSAGES[status] ?? `status ${status}`);
    // The phone is masked; login and password never leave this class.
    throw new NikitaError(status, `${detail} (to ${maskPhone(phone)})`);
  }
}
