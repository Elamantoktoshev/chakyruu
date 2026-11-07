import type { CheckoutRequest, CheckoutResult, GatewayPaymentStatus, PaymentGateway, WebhookEvent, WebhookInput } from './gateway.js';
import { GatewayNotImplemented, WebhookRejected } from './gateway.js';

/**
 * Credentials from the merchant agreement. Variable names are placeholders —
 * TODO: confirm the exact fields with Elsom when the contract is signed.
 */
export interface ElsomConfig {
  merchantId: string;
  secretKey: string;
  apiUrl: string;
}

export function readElsomConfig(env: NodeJS.ProcessEnv): ElsomConfig {
  const config = {
    merchantId: env.ELSOM_MERCHANT_ID ?? '',
    secretKey: env.ELSOM_SECRET_KEY ?? '',
    apiUrl: env.ELSOM_API_URL ?? '',
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`ELSOM_* settings are missing: ${missing.join(', ')}`);
  return config;
}

/** Skeleton for Elsom. Every operation fails loudly until it is implemented against the real API. */
export class ElsomGateway implements PaymentGateway {
  readonly id = 'elsom' as const;

  constructor(private readonly config: ElsomConfig) {}

  async createPayment(_request: CheckoutRequest): Promise<CheckoutResult> {
    // TODO(elsom): create an order at `${this.config.apiUrl}` signed with secretKey,
    // return { kind: 'redirect', url } or { kind: 'qr', qrPayload } with the provider's order id as externalId.
    throw new GatewayNotImplemented(this.id, 'createPayment');
  }

  async parseWebhook(_input: WebhookInput): Promise<WebhookEvent> {
    // TODO(elsom): verify the provider signature over the raw body with secretKey (constant-time compare),
    // then map the provider status to SUCCEEDED / FAILED. Until then every webhook is rejected.
    throw new WebhookRejected('Elsom webhook signature verification is not implemented');
  }

  async checkStatus(_externalId: string): Promise<GatewayPaymentStatus> {
    // TODO(elsom): query the order status at the provider API.
    throw new GatewayNotImplemented(this.id, 'checkStatus');
  }
}
