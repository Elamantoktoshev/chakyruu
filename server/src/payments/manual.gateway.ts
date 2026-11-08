import type { PaymentProviderId } from '@chakyruu/shared';
import type { CheckoutRequest, CheckoutResult, GatewayPaymentStatus, PaymentGateway, WebhookEvent } from './gateway.js';
import { WebhookRejected } from './gateway.js';

/** Our account number in each bank people can transfer from. */
export type ManualReceivers = Readonly<Record<PaymentProviderId, string>>;

/**
 * Launch mode: the payer transfers to our number in the bank they picked (MBank or Simbank) with
 * their names and the toy day in the comment, and an ADMIN confirms the payment in /admin.
 */
export class ManualGateway implements PaymentGateway {
  readonly id = 'manual' as const;

  constructor(private readonly receivers: ManualReceivers) {}

  async createPayment({ paymentId, amountTyiyn, reference, comment, method }: CheckoutRequest): Promise<CheckoutResult> {
    return {
      kind: 'manual',
      externalId: `manual_${paymentId}`,
      instructions: { bank: method, receiver: this.receivers[method], comment, reference, amountSom: amountTyiyn / 100 },
    };
  }

  async parseWebhook(): Promise<WebhookEvent> {
    throw new WebhookRejected('Manual payments have no webhook — confirm them in /admin');
  }

  async checkStatus(): Promise<GatewayPaymentStatus> {
    return 'PENDING';
  }
}
