import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { CheckoutRequest, CheckoutResult, GatewayPaymentStatus, PaymentGateway, WebhookEvent, WebhookInput } from './gateway.js';
import { WebhookRejected } from './gateway.js';

export const FAKE_SIGNATURE_HEADER = 'x-fake-signature';

const fakeWebhookSchema = z.object({ externalId: z.string().min(1).max(100), status: z.enum(['SUCCEEDED', 'FAILED']) });

interface FakeOptions {
  /** 'instant' pays at once (dev); 'redirect' behaves like a real provider (tests of webhooks). */
  mode?: 'instant' | 'redirect';
  webhookSecret?: string;
}

/** Development / tests only — index.ts refuses to start it in production. */
export class FakeGateway implements PaymentGateway {
  readonly id = 'fake' as const;
  private readonly mode: 'instant' | 'redirect';
  private readonly webhookSecret: string;
  private statuses: ReadonlyMap<string, GatewayPaymentStatus> = new Map();

  constructor({ mode = 'instant', webhookSecret = 'fake-webhook-secret' }: FakeOptions = {}) {
    this.mode = mode;
    this.webhookSecret = webhookSecret;
  }

  async createPayment({ paymentId, returnUrl }: CheckoutRequest): Promise<CheckoutResult> {
    const externalId = `fake_${paymentId}`;
    if (this.mode === 'instant') return { kind: 'completed', externalId };
    return { kind: 'redirect', externalId, url: returnUrl };
  }

  /** Test helper: what a provider would send to our webhook. */
  signedWebhook(externalId: string, status: 'SUCCEEDED' | 'FAILED'): { body: string; signature: string } {
    const body = JSON.stringify({ externalId, status });
    return { body, signature: this.sign(Buffer.from(body)) };
  }

  /** Test helper: what checkStatus() should answer. */
  setStatus(externalId: string, status: GatewayPaymentStatus): void {
    this.statuses = new Map([...this.statuses, [externalId, status]]);
  }

  async parseWebhook({ headers, rawBody }: WebhookInput): Promise<WebhookEvent> {
    const given = Buffer.from(headers[FAKE_SIGNATURE_HEADER] ?? '', 'hex');
    const expected = Buffer.from(this.sign(rawBody), 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new WebhookRejected('Bad signature');
    const parsed = fakeWebhookSchema.safeParse(JSON.parse(rawBody.toString('utf8')));
    if (!parsed.success) throw new WebhookRejected('Malformed webhook body');
    return { ...parsed.data, raw: parsed.data };
  }

  async checkStatus(externalId: string): Promise<GatewayPaymentStatus> {
    return this.statuses.get(externalId) ?? 'PENDING';
  }

  private sign(body: Buffer): string {
    return createHmac('sha256', this.webhookSecret).update(body).digest('hex');
  }
}
