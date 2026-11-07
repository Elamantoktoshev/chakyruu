const VISIBLE_TAIL_DIGITS = 2;
const COUNTRY_PREFIX_LENGTH = 4; // "+996"

/** Phone numbers are PII: log them as +996*******56. */
export function maskPhone(phone: string): string {
  const hidden = Math.max(0, phone.length - COUNTRY_PREFIX_LENGTH - VISIBLE_TAIL_DIGITS);
  return `${phone.slice(0, COUNTRY_PREFIX_LENGTH)}${'*'.repeat(hidden)}${phone.slice(-VISIBLE_TAIL_DIGITS)}`;
}

/** Outbound SMS channel: Nikita.kg in production (nikita.provider.ts), console in development. */
/** One Unicode SMS holds 70 characters; this text stays within a single part. */
export function loginCodeText(code: string): string {
  return `Chakyruu.kg: кирүү коду ${code}. Эч кимге айтпаңыз.`;
}

export interface SmsProvider {
  send(phone: string, text: string): Promise<void>;
}

/** Development only: prints the message to the server log instead of sending it. */
export class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, text: string): Promise<void> {
    console.info(`[sms:dev] → ${maskPhone(phone)}: ${text}`);
  }
}

export interface SentSms {
  phone: string;
  text: string;
}

/** Tests: keeps messages in memory so a test can read the code it was "sent". */
export class MemorySmsProvider implements SmsProvider {
  private messages: readonly SentSms[] = [];

  async send(phone: string, text: string): Promise<void> {
    this.messages = [...this.messages, { phone, text }];
  }

  get sent(): readonly SentSms[] {
    return this.messages;
  }

  /** Extracts the 6-digit code from the most recent SMS sent to `phone`. */
  lastCodeFor(phone: string): string {
    const last = [...this.messages].reverse().find((message) => message.phone === phone);
    const code = last?.text.match(/\b(\d{6})\b/)?.[1];
    if (!code) throw new Error(`No code was sent to ${phone}`);
    return code;
  }
}
