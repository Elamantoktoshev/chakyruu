import { randomBytes } from 'node:crypto';
import { logger } from '../lib/logger.js';
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

/** What went wrong, grouped by what the admin has to do about it. */
export type NikitaFailureKind =
  | 'format'
  | 'auth'
  | 'ip'
  | 'funds'
  | 'sender'
  | 'stopwords'
  | 'phone'
  | 'time'
  | 'busy'
  | 'duplicate'
  | 'http'
  | 'unknown';

interface StatusInfo {
  kind: NikitaFailureKind;
  detail: string;
}

/** Response statuses of /api/message (protocol section 1, "статусы отправки"). */
const STATUSES: Readonly<Record<number, StatusInfo>> = {
  1: { kind: 'format', detail: 'invalid request format' },
  2: { kind: 'auth', detail: 'invalid login or password' },
  3: { kind: 'ip', detail: 'server IP address is not allowed' },
  4: { kind: 'funds', detail: 'not enough money on the Nikita.kg account' },
  5: { kind: 'sender', detail: 'sender name is not approved by Nikita.kg' },
  6: { kind: 'stopwords', detail: 'message blocked by stop-words' },
  7: { kind: 'phone', detail: 'invalid phone number' },
  8: { kind: 'time', detail: 'invalid send time' },
  9: { kind: 'busy', detail: 'gateway busy' },
  10: { kind: 'duplicate', detail: 'duplicate message id' },
};

/** What the admin should do; written next to the error in the logs. */
const HINTS: Readonly<Record<NikitaFailureKind, string>> = {
  format: 'request rejected as malformed; check NIKITA_SENDER and the message text',
  auth: 'check NIKITA_LOGIN / NIKITA_PASSWORD',
  ip: 'allow the server IP in the smspro.nikita.kg cabinet (My profile → API parameters)',
  funds: 'top up the balance in the smspro.nikita.kg cabinet',
  sender: 'NIKITA_SENDER must be a sender name approved by Nikita.kg',
  stopwords: 'the SMS text contains words blocked by Nikita.kg; change loginCodeText',
  phone: 'the gateway rejected the phone number',
  time: 'the <time> field is invalid',
  busy: 'gateway overloaded; it was retried once, try again later',
  duplicate: 'message id repeated; ids must be unique per sending',
  http: 'smspro.nikita.kg is unreachable or answered with an HTTP error',
  unknown: 'unexpected answer from smspro.nikita.kg',
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
  readonly hint: string;

  constructor(
    readonly status: number | null,
    readonly kind: NikitaFailureKind,
    detail: string,
  ) {
    super(`Nikita.kg: ${detail}`);
    this.name = 'NikitaError';
    this.hint = HINTS[kind];
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

const readNumber = (responseXml: string, tag: string): number | null => {
  const match = new RegExp(`<${tag}>\\s*(\\d+)\\s*</${tag}>`).exec(responseXml);
  return match ? Number(match[1]) : null;
};

export function readStatus(responseXml: string): number | null {
  return readNumber(responseXml, 'status');
}

/** <smscnt>: how many SMS parts the text was split into (each part is charged). */
export function readSmsCount(responseXml: string): number | null {
  return readNumber(responseXml, 'smscnt');
}

interface GatewayAnswer {
  status: number | null;
  smsCount: number | null;
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
    const first = await this.post(body, phone);
    if (first.status !== STATUS_BUSY) return this.check(first, phone);
    await this.wait(BUSY_RETRY_DELAY_MS);
    return this.check(await this.post(body, phone), phone);
  }

  private async post(body: string, phone: string): Promise<GatewayAnswer> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.name : 'network error';
      throw new NikitaError(null, 'http', `request failed: ${reason} (to ${maskPhone(phone)})`);
    }
    if (!response.ok) throw new NikitaError(null, 'http', `HTTP ${response.status} (to ${maskPhone(phone)})`);
    const responseXml = await response.text();
    return { status: readStatus(responseXml), smsCount: readSmsCount(responseXml) };
  }

  private check({ status, smsCount }: GatewayAnswer, phone: string): void {
    if (status === STATUS_ACCEPTED || (this.config.isTestMode && status === STATUS_TEST_ACCEPTED)) {
      if (smsCount !== null && smsCount > 1) {
        logger.warn({ smsCount }, '[sms] Nikita.kg split the login SMS into several parts; each part is charged — shorten the text');
      }
      return;
    }
    const info: StatusInfo =
      status === null ? { kind: 'unknown', detail: 'unreadable response' } : (STATUSES[status] ?? { kind: 'unknown', detail: `status ${status}` });
    // The phone is masked; login and password never leave this class.
    throw new NikitaError(status, info.kind, `${info.detail} (to ${maskPhone(phone)})`);
  }
}
