import type { CheckoutRequest, CheckoutResult, GatewayPaymentStatus, PaymentGateway, WebhookEvent } from './gateway.js';
import { WebhookRejected } from './gateway.js';

/**
 * Launch mode: the payer transfers to our MBank number with the reference in the comment,
 * and an ADMIN confirms the payment in /admin after seeing the money arrive.
 */
export class ManualGateway implements PaymentGateway {
  readonly id = 'manual' as const;

  constructor(private readonly receiver: string) {}

  async createPayment({ paymentId, amountTyiyn, reference }: CheckoutRequest): Promise<CheckoutResult> {
    return {
      kind: 'manual',
      externalId: `manual_${paymentId}`,
      instructions: { receiver: this.receiver, reference, amountSom: amountTyiyn / 100 },
    };
  }

  async parseWebhook(): Promise<WebhookEvent> {
    throw new WebhookRejected('Manual payments have no webhook — confirm them in /admin');
  }

  async checkStatus(): Promise<GatewayPaymentStatus> {
    return 'PENDING';
  }
}
