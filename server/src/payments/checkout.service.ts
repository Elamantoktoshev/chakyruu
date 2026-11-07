import { randomInt } from 'node:crypto';
import { GIFT_CODE_ALPHABET } from '@chakyruu/shared';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { isUniqueViolation } from '../invitations/slug.service.js';
import { fulfillPayment, markPaymentFailed } from './fulfill.service.js';
import type { CheckoutResult, ManualInstructions, PaymentGateway } from './gateway.js';

const REFERENCE_LENGTH = 5;
const MAX_REFERENCE_ATTEMPTS = 3;

/** "CH-7K3MX" — short enough to type into a bank transfer comment. */
export function generateReference(): string {
  const code = Array.from({ length: REFERENCE_LENGTH }, () => GIFT_CODE_ALPHABET[randomInt(GIFT_CODE_ALPHABET.length)]).join('');
  return `CH-${code}`;
}

export type CheckoutView =
  | { kind: 'redirect'; url: string }
  | { kind: 'qr'; qrPayload: string; url?: string }
  | { kind: 'manual'; instructions: ManualInstructions };

export interface CheckoutOutcome {
  paymentId: string;
  status: 'SUCCEEDED' | 'PENDING';
  checkout?: CheckoutView;
}

/** Creates a PENDING payment with a unique reference (retries on the rare collision). */
export async function createPendingPayment(
  data: Omit<Prisma.PaymentUncheckedCreateInput, 'reference'>,
  tx: Prisma.TransactionClient = prisma,
): Promise<{ id: string; reference: string }> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const payment = await tx.payment.create({ data: { ...data, reference: generateReference() }, select: { id: true, reference: true } });
      return { id: payment.id, reference: payment.reference ?? '' };
    } catch (error: unknown) {
      if (!isUniqueViolation(error) || attempt >= MAX_REFERENCE_ATTEMPTS) throw error;
    }
  }
}

function toView(result: Exclude<CheckoutResult, { kind: 'completed' }>): CheckoutView {
  if (result.kind === 'redirect') return { kind: 'redirect', url: result.url };
  if (result.kind === 'qr') return { kind: 'qr', qrPayload: result.qrPayload, ...(result.url ? { url: result.url } : {}) };
  return { kind: 'manual', instructions: result.instructions };
}

interface RunCheckoutInput {
  payment: { id: string; reference: string };
  amountTyiyn: number;
  method: Prisma.PaymentUncheckedCreateInput['provider'];
  description: string;
  appUrl: string;
}

/** Asks the gateway what the payer must do; an instant success is fulfilled right away. */
export async function runCheckout(gateway: PaymentGateway, input: RunCheckoutInput): Promise<CheckoutOutcome> {
  const { payment } = input;
  let result: CheckoutResult;
  try {
    result = await gateway.createPayment({
      paymentId: payment.id,
      amountTyiyn: input.amountTyiyn,
      method: input.method,
      description: input.description,
      reference: payment.reference,
      returnUrl: `${input.appUrl.replace(/\/+$/, '')}/pay/result/${payment.id}`,
    });
  } catch (error: unknown) {
    console.error(`[payments] ${gateway.id} checkout failed for payment ${payment.id}`, error);
    await markPaymentFailed(payment.id, { error: error instanceof Error ? error.message : 'unknown' });
    throw new HttpError(502, 'Payment provider is unavailable, please try again later');
  }

  if (result.kind === 'completed') {
    await fulfillPayment(payment.id, { externalId: result.externalId, raw: result });
    return { paymentId: payment.id, status: 'SUCCEEDED' };
  }
  const view = toView(result);
  await prisma.payment.update({
    where: { id: payment.id },
    data: { externalId: result.externalId, rawResponse: view as unknown as Prisma.InputJsonValue },
  });
  return { paymentId: payment.id, status: 'PENDING', checkout: view };
}
