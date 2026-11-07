import type { CheckoutRequest, CheckoutResult, GatewayPaymentStatus, PaymentGateway, WebhookEvent, WebhookInput } from './gateway.js';
import { GatewayNotImplemented, WebhookRejected } from './gateway.js';

/**
 * Credentials from the merchant agreement. Variable names are placeholders —
 * TODO: confirm the exact fields with ODengi when the contract is signed.
 */
export interface ODengiConfig {
  merchantId: string;
  secretKey: string;
  apiUrl: string;
}

export function readODengiConfig(env: NodeJS.ProcessEnv): ODengiConfig {
  const config = {
    merchantId: env.ODENGI_MERCHANT_ID ?? '',
    secretKey: env.ODENGI_SECRET_KEY ?? '',
    apiUrl: env.ODENGI_API_URL ?? '',
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`ODENGI_* settings are missing: ${missing.join(', ')}`);
  return config;
}

/** Skeleton for ODengi. Every operation fails loudly until it is implemented against the real API. */
export class ODengiGateway implements PaymentGateway {
  readonly id = 'odengi' as const;

  constructor(private readonly config: ODengiConfig) {}

  async createPayment(_request: CheckoutRequest): Promise<CheckoutResult> {
    // TODO(odengi): create an order at `${this.config.apiUrl}` signed with secretKey,
    // return { kind: 'redirect', url } or { kind: 'qr', qrPayload } with the provider's order id as externalId.
    throw new GatewayNotImplemented(this.id, 'createPayment');
  }

  async parseWebhook(_input: WebhookInput): Promise<WebhookEvent> {
    // TODO(odengi): verify the provider signature over the raw body with secretKey (constant-time compare),
    // then map the provider status to SUCCEEDED / FAILED. Until then every webhook is rejected.
    throw new WebhookRejected('ODengi webhook signature verification is not implemented');
  }

  async checkStatus(_externalId: string): Promise<GatewayPaymentStatus> {
    // TODO(odengi): query the order status at the provider API.
    throw new GatewayNotImplemented(this.id, 'checkStatus');
  }
}
