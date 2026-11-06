import type { PaymentProviderId } from '@chakyruu/shared';

export interface CheckoutRequest {
  paymentId: string;
  amountTyiyn: number;
  provider: PaymentProviderId;
  description: string;
}

/**
 * Real providers (MBank, O!Деньги, Элсом) will answer with a redirect and confirm
 * later through a webhook; the fake one completes immediately.
 */
export type CheckoutResult =
  | { kind: 'completed'; externalId: string }
  | { kind: 'redirect'; url: string; externalId: string };

export interface PaymentProvider {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
}

/** Development/tests only: every payment succeeds instantly. */
export class FakePaymentProvider implements PaymentProvider {
  async createCheckout({ paymentId }: CheckoutRequest): Promise<CheckoutResult> {
    return { kind: 'completed', externalId: `fake_${paymentId}` };
  }
}
